import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Custom error thrown when rate limit storage is required but unavailable (fail-closed policy).
 */
export class RateLimitStorageUnavailableError extends Error {
  constructor(message = 'Rate limit storage unavailable') {
    super(message);
    this.name = 'RateLimitStorageUnavailableError';
    this.statusCode = 503;
    this.code = 'RATE_LIMIT_STORAGE_UNAVAILABLE';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitStorageUnavailableError);
    }
  }
}

/**
 * Mongoose Schema for Distributed Rate Limiting.
 * Stores hit counts and reset timestamps with MongoDB TTL auto-cleanup.
 */
const rateLimitDocSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    totalHits: { type: Number, required: true, default: 1 },
    resetTime: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'ratelimits'
  }
);

// Prevent re-compilation of model in hot-reload or multi-import environments
export const RateLimitModel =
  mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitDocSchema);

/**
 * Production-ready MongoDB store for express-rate-limit.
 *
 * Provides shared, atomic rate-limit state across multiple serverless instances
 * (e.g. Vercel Lambdas) and horizontally scaled container replicas.
 *
 * Storage Policies:
 * - 'fail-closed': Rejects requests with HTTP 503 if MongoDB is unavailable.
 *   Essential for sensitive authentication routes (login, register) to prevent
 *   brute-force attacks across serverless instances during database outages.
 *   In-memory fallback is disabled for this policy.
 * - 'degraded-local': Falls back to per-process in-memory counters during database
 *   outages to preserve basic availability for non-sensitive endpoints, while
 *   explicitly logging and advertising non-distributed degraded mode via headers.
 *
 * Features:
 * 1. Atomic increment via MongoDB findOneAndUpdate ($inc).
 * 2. Automatic record expiry using MongoDB native TTL indexes on `expiresAt`.
 * 3. Configurable outage policy (fail-closed for auth, degraded-local for general API).
 * 4. Key prefix namespacing to segregate different rate-limit policies (auth vs general).
 */
export class MongoRateLimitStore {
  /**
   * @param {Object} options
   * @param {string} [options.prefix='rl:'] - Key prefix for namespace segregation
   * @param {number} [options.windowMs=900000] - Window duration in milliseconds
   * @param {mongoose.Model} [options.model] - Optional custom Mongoose model
   * @param {'fail-closed' | 'degraded-local'} [options.outagePolicy='degraded-local'] - Outage policy
   */
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.model = options.model || RateLimitModel;
    this.outagePolicy = options.outagePolicy || 'degraded-local';
    this.localKeys = false; // Indicates shared distributed storage to express-rate-limit

    // In-memory fallback map for resilience when MongoDB is disconnected (degraded-local only)
    this.fallbackMap = new Map();
  }

  /**
   * Initializes the store with options from express-rate-limit.
   *
   * @param {Object} options - Options passed to rateLimit()
   */
  init(options) {
    if (options && options.windowMs) {
      this.windowMs = options.windowMs;
    }
  }

  /**
   * Check if MongoDB connection is ready for atomic queries.
   *
   * @returns {boolean}
   */
  isDbReady() {
    return Boolean(
      mongoose.connection &&
      mongoose.connection.readyState === 1 &&
      this.model &&
      this.model.collection
    );
  }

  /**
   * Increment a client's hit counter atomically in MongoDB.
   *
   * @param {string} key - Client identifier (typically IP address)
   * @returns {Promise<{ totalHits: number, resetTime: Date }>}
   */
  async increment(key) {
    const fullKey = `${this.prefix}${key}`;
    const now = new Date();

    if (this.isDbReady()) {
      try {
        const collection = this.model.collection;

        // 1. Try incrementing an active window where resetTime > now
        const existing = await collection.findOneAndUpdate(
          { _id: fullKey, resetTime: { $gt: now } },
          { $inc: { totalHits: 1 } },
          { returnDocument: 'after' }
        );

        if (existing) {
          return {
            totalHits: existing.totalHits,
            resetTime: existing.resetTime
          };
        }

        const resetTime = new Date(now.getTime() + this.windowMs);

        // 2. If an expired window exists (resetTime <= now), reset it atomically
        const resetExpired = await collection.findOneAndUpdate(
          { _id: fullKey, resetTime: { $lte: now } },
          {
            $set: {
              totalHits: 1,
              resetTime,
              expiresAt: resetTime
            }
          },
          { returnDocument: 'after' }
        );

        if (resetExpired) {
          return {
            totalHits: resetExpired.totalHits,
            resetTime: resetExpired.resetTime
          };
        }

        // 3. Document does not exist: upsert atomically with $setOnInsert
        const upserted = await collection.findOneAndUpdate(
          { _id: fullKey },
          {
            $setOnInsert: {
              resetTime,
              expiresAt: resetTime
            },
            $inc: { totalHits: 1 }
          },
          { upsert: true, returnDocument: 'after' }
        );

        return {
          totalHits: upserted.totalHits,
          resetTime: upserted.resetTime || resetTime
        };
      } catch (dbErr) {
        if (this.outagePolicy === 'fail-closed') {
          logger.error(
            `[RateLimit] MongoDB storage query error in fail-closed store (${this.prefix}): ${dbErr.message}`
          );
          throw new RateLimitStorageUnavailableError(
            'Authentication rate-limit service unavailable. Shared storage query failed.'
          );
        }

        // Log safe warning without leaking internal connection info or crashing
        logger.warn(
          `[RateLimit] MongoDB storage error: ${dbErr.message}. Operating in degraded local-memory mode.`
        );
      }
    } else {
      if (this.outagePolicy === 'fail-closed') {
        logger.warn(
          `[RateLimit] MongoDB storage unavailable for fail-closed namespace (${this.prefix}). Denying request.`
        );
        throw new RateLimitStorageUnavailableError(
          'Authentication rate-limit service unavailable. Database connection is not ready.'
        );
      }
      logger.warn(
        `[RateLimit] MongoDB storage unavailable for general namespace (${this.prefix}). Operating in degraded local-memory mode (non-distributed).`
      );
    }

    // Fallback to process memory for degraded-local policy
    return this.fallbackIncrement(fullKey, now);
  }

  /**
   * Internal in-memory fallback increment when MongoDB is unreachable.
   * Only accessible for 'degraded-local' policy; rejected for 'fail-closed'.
   *
   * @param {string} fullKey
   * @param {Date} now
   * @returns {{ totalHits: number, resetTime: Date }}
   */
  fallbackIncrement(fullKey, now) {
    if (this.outagePolicy === 'fail-closed') {
      throw new RateLimitStorageUnavailableError(
        'Authentication rate-limit service unavailable. In-memory fallback is disabled for fail-closed policy.'
      );
    }

    let client = this.fallbackMap.get(fullKey);
    if (!client || client.resetTime.getTime() <= now.getTime()) {
      client = {
        totalHits: 0,
        resetTime: new Date(now.getTime() + this.windowMs)
      };
      this.fallbackMap.set(fullKey, client);
    }

    client.totalHits += 1;
    return {
      totalHits: client.totalHits,
      resetTime: client.resetTime
    };
  }

  /**
   * Retrieve hit count and reset time for a client.
   *
   * @param {string} key
   * @returns {Promise<{ totalHits: number, resetTime: Date } | undefined>}
   */
  async get(key) {
    const fullKey = `${this.prefix}${key}`;
    const now = new Date();

    if (this.isDbReady()) {
      try {
        const doc = await this.model.collection.findOne({ _id: fullKey });
        if (doc && doc.resetTime > now) {
          return {
            totalHits: doc.totalHits,
            resetTime: doc.resetTime
          };
        }
        return undefined;
      } catch {
        // Fallback below
      }
    }

    if (this.outagePolicy === 'fail-closed') {
      return undefined;
    }

    const client = this.fallbackMap.get(fullKey);
    if (client && client.resetTime.getTime() > now.getTime()) {
      return {
        totalHits: client.totalHits,
        resetTime: client.resetTime
      };
    }
    return undefined;
  }

  /**
   * Decrement hit count for a client.
   *
   * @param {string} key
   */
  async decrement(key) {
    const fullKey = `${this.prefix}${key}`;
    if (this.isDbReady()) {
      try {
        await this.model.collection.updateOne(
          { _id: fullKey, totalHits: { $gt: 0 } },
          { $inc: { totalHits: -1 } }
        );
        return;
      } catch {
        // Fallback below
      }
    }

    if (this.outagePolicy === 'fail-closed') {
      return;
    }

    const client = this.fallbackMap.get(fullKey);
    if (client && client.totalHits > 0) {
      client.totalHits -= 1;
    }
  }

  /**
   * Reset a client's hit counter.
   *
   * @param {string} key
   */
  async resetKey(key) {
    const fullKey = `${this.prefix}${key}`;
    if (this.isDbReady()) {
      try {
        await this.model.collection.deleteOne({ _id: fullKey });
      } catch {
        // Ignore
      }
    }
    if (this.outagePolicy !== 'fail-closed') {
      this.fallbackMap.delete(fullKey);
    }
  }

  /**
   * Reset all counters for this store's prefix.
   */
  async resetAll() {
    if (this.isDbReady()) {
      try {
        await this.model.collection.deleteMany({
          _id: { $regex: `^${this.prefix}` }
        });
      } catch {
        // Ignore
      }
    }
    this.fallbackMap.clear();
  }

  /**
   * Shutdown store and clear local memory.
   */
  shutdown() {
    this.fallbackMap.clear();
  }
}


