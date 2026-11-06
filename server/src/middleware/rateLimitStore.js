import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

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
 * Features:
 * 1. Atomic increment via MongoDB findOneAndUpdate ($inc).
 * 2. Automatic record expiry using MongoDB native TTL indexes on `expiresAt`.
 * 3. Graceful in-memory fallback during temporary database disconnects or cold start lag,
 *    preventing 500 errors and information disclosure.
 * 4. Key prefix namespacing to segregate different rate-limit policies (auth vs general).
 */
export class MongoRateLimitStore {
  /**
   * @param {Object} options
   * @param {string} [options.prefix='rl:'] - Key prefix for namespace segregation
   * @param {number} [options.windowMs=900000] - Window duration in milliseconds
   * @param {mongoose.Model} [options.model] - Optional custom Mongoose model
   */
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.model = options.model || RateLimitModel;
    this.localKeys = false; // Indicates shared distributed storage to express-rate-limit

    // In-memory fallback map for resilience when MongoDB is disconnected
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
        // Log safe warning without leaking internal connection info or crashing
        logger.warn(
          `[RateLimit] MongoDB storage error: ${dbErr.message}. Falling back to process memory.`
        );
      }
    }

    // Fallback to process memory when database is not ready or query fails
    return this.fallbackIncrement(fullKey, now);
  }

  /**
   * Internal in-memory fallback increment when MongoDB is unreachable.
   *
   * @param {string} fullKey
   * @param {Date} now
   * @returns {{ totalHits: number, resetTime: Date }}
   */
  fallbackIncrement(fullKey, now) {
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
    this.fallbackMap.delete(fullKey);
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

