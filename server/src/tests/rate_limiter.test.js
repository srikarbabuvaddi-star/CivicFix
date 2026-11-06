import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { MongoRateLimitStore, RateLimitModel } from '../middleware/rateLimitStore.js';
import { createRateLimiter, authStore, generalStore } from '../middleware/rateLimiter.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_ratelimit';

describe('CivicFix Distributed Rate Limiting & Storage Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = TEST_DB_URI;
    process.env.SESSION_SECRET = 'test_session_secret_32_chars_minimum_length_required!';

    await connectDB(TEST_DB_URI);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.dropDatabase();
      } catch {
        // Ignore drop errors
      }
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await RateLimitModel.deleteMany({});
    }
    authStore.shutdown();
    generalStore.shutdown();
  });

  describe('1. MongoRateLimitStore Unit & Atomic Behavior', () => {
    it('initializes and performs atomic increment in MongoDB', async () => {
      const store = new MongoRateLimitStore({
        prefix: 'rl:unit_test:',
        windowMs: 60000
      });

      const res1 = await store.increment('client-ip-1');
      expect(res1.totalHits).toBe(1);
      expect(res1.resetTime).toBeInstanceOf(Date);
      expect(res1.resetTime.getTime()).toBeGreaterThan(Date.now());

      const res2 = await store.increment('client-ip-1');
      expect(res2.totalHits).toBe(2);

      // Verify document in MongoDB
      const doc = await RateLimitModel.findById('rl:unit_test:client-ip-1');
      expect(doc).toBeDefined();
      expect(doc.totalHits).toBe(2);
      expect(doc.expiresAt).toBeInstanceOf(Date);

      // Test get()
      const got = await store.get('client-ip-1');
      expect(got).toBeDefined();
      expect(got.totalHits).toBe(2);

      // Test decrement()
      await store.decrement('client-ip-1');
      const docAfterDec = await RateLimitModel.findById('rl:unit_test:client-ip-1');
      expect(docAfterDec.totalHits).toBe(1);

      // Test resetKey()
      await store.resetKey('client-ip-1');
      const docAfterReset = await RateLimitModel.findById('rl:unit_test:client-ip-1');
      expect(docAfterReset).toBeNull();
    });

    it('handles high concurrent increments atomically without race conditions', async () => {
      const store = new MongoRateLimitStore({
        prefix: 'rl:concurrency:',
        windowMs: 60000
      });

      // 10 concurrent requests from the same client
      const promises = Array.from({ length: 10 }).map(() =>
        store.increment('client-concurrent')
      );
      const results = await Promise.all(promises);

      const hitNumbers = results.map((r) => r.totalHits).sort((a, b) => a - b);
      expect(hitNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const doc = await RateLimitModel.findById('rl:concurrency:client-concurrent');
      expect(doc.totalHits).toBe(10);
    });

    it('resets window when previous window expires', async () => {
      const store = new MongoRateLimitStore({
        prefix: 'rl:expiry:',
        windowMs: 100 // 100ms short window
      });

      const first = await store.increment('client-expired');
      expect(first.totalHits).toBe(1);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const afterExpiry = await store.increment('client-expired');
      expect(afterExpiry.totalHits).toBe(1); // Reset to 1 for new window
      expect(afterExpiry.resetTime.getTime()).toBeGreaterThan(first.resetTime.getTime());
    });
  });

  describe('2. HTTP Rate-Limit Enforcement & Standard Headers', () => {
    it('enforces request limit and returns HTTP 429 with standard RateLimit headers', async () => {
      const testLimiter = createRateLimiter({
        prefix: 'rl:http_test:',
        windowMs: 60000,
        max: 3,
        message: {
          success: false,
          message: 'Rate limit exceeded for testing.',
          statusCode: 429
        }
      });

      const app = express();
      app.use(express.json());
      app.post('/api/test-endpoint', testLimiter, (req, res) => {
        res.status(200).json({ success: true, message: 'Request accepted' });
      });

      // Request 1: Allowed (Remaining: 2)
      const res1 = await request(app).post('/api/test-endpoint');
      expect(res1.status).toBe(200);
      expect(res1.headers['ratelimit-limit']).toBe('3');
      expect(res1.headers['ratelimit-remaining']).toBe('2');

      // Request 2: Allowed (Remaining: 1)
      const res2 = await request(app).post('/api/test-endpoint');
      expect(res2.status).toBe(200);
      expect(res2.headers['ratelimit-remaining']).toBe('1');

      // Request 3: Allowed (Remaining: 0)
      const res3 = await request(app).post('/api/test-endpoint');
      expect(res3.status).toBe(200);
      expect(res3.headers['ratelimit-remaining']).toBe('0');

      // Request 4: Blocked with 429
      const res4 = await request(app).post('/api/test-endpoint');
      expect(res4.status).toBe(429);
      expect(res4.body.success).toBe(false);
      expect(res4.body.message).toBe('Rate limit exceeded for testing.');
      expect(res4.headers['retry-after']).toBeDefined();
      expect(res4.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('3. Multi-Instance / Serverless Shared Storage Coordination', () => {
    it('genuinely coordinates rate limits across multiple independent serverless/app instances', async () => {
      // Simulate two separate serverless instances (Instance A and Instance B)
      // Both instances have independent Express apps and independent memory spaces,
      // but connect to the same shared MongoDB database
      const sharedStoreA = new MongoRateLimitStore({
        prefix: 'rl:serverless_cluster:',
        windowMs: 60000
      });
      const sharedStoreB = new MongoRateLimitStore({
        prefix: 'rl:serverless_cluster:',
        windowMs: 60000
      });

      const limiterA = createRateLimiter({ store: sharedStoreA, max: 3 });
      const limiterB = createRateLimiter({ store: sharedStoreB, max: 3 });

      const appInstanceA = express();
      appInstanceA.post('/login', limiterA, (req, res) => res.json({ instance: 'A', success: true }));

      const appInstanceB = express();
      appInstanceB.post('/login', limiterB, (req, res) => res.json({ instance: 'B', success: true }));

      // Hit 1 -> Handled by Serverless Instance A (Counter in MongoDB = 1)
      const hit1 = await request(appInstanceA).post('/login');
      expect(hit1.status).toBe(200);
      expect(hit1.body.instance).toBe('A');

      // Hit 2 -> Handled by Serverless Instance B (Counter in MongoDB = 2)
      const hit2 = await request(appInstanceB).post('/login');
      expect(hit2.status).toBe(200);
      expect(hit2.body.instance).toBe('B');

      // Hit 3 -> Handled by Serverless Instance A (Counter in MongoDB = 3)
      const hit3 = await request(appInstanceA).post('/login');
      expect(hit3.status).toBe(200);
      expect(hit3.body.instance).toBe('A');

      // Hit 4 -> Handled by Serverless Instance B (Limit reached across instances -> 429)
      const hit4 = await request(appInstanceB).post('/login');
      expect(hit4.status).toBe(429);

      // Hit 5 -> Handled by Serverless Instance A -> Also 429
      const hit5 = await request(appInstanceA).post('/login');
      expect(hit5.status).toBe(429);
    });

    it('preserves counters across serverless cold starts and container restarts', async () => {
      // Step 1: Request arrives at initial instance
      const initialStore = new MongoRateLimitStore({
        prefix: 'rl:cold_start:',
        windowMs: 60000
      });
      const initialLimiter = createRateLimiter({ store: initialStore, max: 2 });
      let app = express();
      app.post('/register', initialLimiter, (req, res) => res.json({ success: true }));

      const r1 = await request(app).post('/register');
      expect(r1.status).toBe(200);

      const r2 = await request(app).post('/register');
      expect(r2.status).toBe(200);

      // Step 2: Simulate complete serverless cold restart / instance recycle
      // All in-memory variables and references are dropped and garbage collected
      app = null;

      // Step 3: New cold start instance spins up
      const freshColdStartStore = new MongoRateLimitStore({
        prefix: 'rl:cold_start:',
        windowMs: 60000
      });
      const freshLimiter = createRateLimiter({ store: freshColdStartStore, max: 2 });
      const freshApp = express();
      freshApp.post('/register', freshLimiter, (req, res) => res.json({ success: true }));

      // Request 3 arrives at new cold instance: should immediately be blocked by shared MongoDB state
      const r3 = await request(freshApp).post('/register');
      expect(r3.status).toBe(429);
    });
  });

  describe('4. Namespace Isolation between General API and Auth Limits', () => {
    it('isolates general API hits from authentication rate limits', async () => {
      const genStore = new MongoRateLimitStore({
        prefix: 'rl:iso_gen:',
        windowMs: 60000
      });
      const authStoreIso = new MongoRateLimitStore({
        prefix: 'rl:iso_auth:',
        windowMs: 60000
      });

      const gLimiter = createRateLimiter({ store: genStore, max: 2 });
      const aLimiter = createRateLimiter({ store: authStoreIso, max: 2 });

      const app = express();
      app.get('/api/issues', gLimiter, (req, res) => res.json({ endpoint: 'general' }));
      app.post('/api/auth/login', aLimiter, (req, res) => res.json({ endpoint: 'auth' }));

      // Consume general API limit
      await request(app).get('/api/issues');
      await request(app).get('/api/issues');
      const genBlocked = await request(app).get('/api/issues');
      expect(genBlocked.status).toBe(429);

      // Auth endpoint must NOT be affected by general API exhaustion
      const auth1 = await request(app).post('/api/auth/login');
      expect(auth1.status).toBe(200);

      const auth2 = await request(app).post('/api/auth/login');
      expect(auth2.status).toBe(200);

      // Now auth is blocked
      const authBlocked = await request(app).post('/api/auth/login');
      expect(authBlocked.status).toBe(429);
    });
  });

  describe('5. Resilience & Storage Failure Graceful Handling', () => {
    it('falls back gracefully to memory when MongoDB is unreachable without crashing or leaking DB errors', async () => {
      const fallbackStore = new MongoRateLimitStore({
        prefix: 'rl:offline:',
        windowMs: 60000
      });

      // Simulate database disconnected
      fallbackStore.isDbReady = () => false;

      const limiter = createRateLimiter({ store: fallbackStore, max: 2 });
      const app = express();
      app.post('/api/test-resilience', limiter, (req, res) => {
        res.json({ success: true });
      });

      // Request 1: Handled by in-memory fallback
      const r1 = await request(app).post('/api/test-resilience');
      expect(r1.status).toBe(200);
      expect(r1.body.success).toBe(true);

      // Request 2: Handled by in-memory fallback
      const r2 = await request(app).post('/api/test-resilience');
      expect(r2.status).toBe(200);

      // Request 3: Blocked by in-memory fallback
      const r3 = await request(app).post('/api/test-resilience');
      expect(r3.status).toBe(429);

      // Zero internal database errors or connection details exposed
      const bodyStr = JSON.stringify(r3.body);
      expect(bodyStr).not.toContain('mongodb');
      expect(bodyStr).not.toContain('MongoError');
      expect(bodyStr).not.toContain('connection');
    });

    it('safely handles unexpected collection query exceptions by falling back to memory', async () => {
      const failingStore = new MongoRateLimitStore({
        prefix: 'rl:error_fallback:',
        windowMs: 60000
      });

      // Force collection query to throw an error
      failingStore.isDbReady = () => true;
      failingStore.model = {
        collection: {
          findOneAndUpdate: async () => {
            throw new Error('Simulated network timeout to MongoDB cluster');
          }
        }
      };

      const res = await failingStore.increment('client-err-test');
      expect(res.totalHits).toBe(1);
      expect(res.resetTime).toBeInstanceOf(Date);
    });
  });
});

