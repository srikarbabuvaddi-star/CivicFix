import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import * as dbConfig from '../config/db.js';
import vercelHandler from '../../../api/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_health';

describe('CivicFix Health and Readiness Probes Integration Suite', () => {
  let app;
  let serverlessApp;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = TEST_DB_URI;
    process.env.SESSION_SECRET = 'test_session_secret_32_chars_minimum_length_required!';

    await connectDB(TEST_DB_URI);
    app = createApp(TEST_DB_URI);
    serverlessApp = http.createServer(vercelHandler);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.dropDatabase();
      } catch {
        // Ignore drop error during cleanup
      }
      await disconnectDB();
    }
  });

  describe('1. Connected Database Scenarios', () => {
    it('GET /health returns HTTP 200 and indicates database connected', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('connected');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('GET /api/v1/health returns HTTP 200 with service health info', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('connected');
    });

    it('GET /ready returns HTTP 200 when database is connected', async () => {
      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('CivicFix Service Ready');
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
    });

    it('GET /api/v1/ready returns HTTP 200 when database is connected', async () => {
      const res = await request(app).get('/api/v1/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
    });
  });

  describe('2. Disconnected Database Scenarios (MongoDB Unavailable)', () => {
    beforeAll(async () => {
      // Disconnect from MongoDB to simulate database outage
      await disconnectDB();
    });

    afterAll(async () => {
      // Reconnect to leave clean state for subsequent tests
      await connectDB(TEST_DB_URI);
    });

    it('GET /health works independently of MongoDB and returns HTTP 200', async () => {
      const res = await request(app).get('/health');

      // Liveness probe MUST succeed even when database is down
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('disconnected');
    });

    it('GET /api/v1/health works independently of MongoDB and returns HTTP 200', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('disconnected');
    });

    it('GET /ready returns HTTP 503 when database is unavailable', async () => {
      const res = await request(app).get('/ready');

      // Readiness probe MUST fail when database is unavailable
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Database Unavailable');
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.database).toBe('disconnected');
    });

    it('GET /api/v1/ready returns HTTP 503 when database is unavailable', async () => {
      const res = await request(app).get('/api/v1/ready');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Database Unavailable');
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.database).toBe('disconnected');
    });
  });

  describe('3. Vercel Serverless Handler Health Check Verification', () => {
    beforeAll(async () => {
      if (mongoose.connection.readyState !== 0) {
        await disconnectDB();
      }
    });

    it('Vercel handler executes /health without requiring database connection', async () => {
      const res = await request(serverlessApp).get('/health');

      expect(res.status).toBe(200);
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.database).toBe('disconnected');
    });

    it('Vercel handler executes /api/v1/health without requiring database connection', async () => {
      const res = await request(serverlessApp).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.database).toBe('disconnected');
    });

    it('Vercel handler returns HTTP 503 for /ready when database connection fails', async () => {
      const spy = vi.spyOn(dbConfig, 'connectDB').mockRejectedValueOnce(new Error('MongoNetworkError: failed to connect to server'));

      const res = await request(serverlessApp).get('/ready');

      expect(res.status).toBe(503);
      expect(res.body?.data?.status).toBe('not_ready');
      expect(res.body?.data?.database).toBe('disconnected');
      spy.mockRestore();
    });

    it('Vercel handler returns HTTP 503 for stateful API route when database connection fails', async () => {
      const spy = vi.spyOn(dbConfig, 'connectDB').mockRejectedValueOnce(new Error('MongoNetworkError: failed to connect to server'));

      const res = await request(serverlessApp).get('/api/v1/auth/me');

      expect(res.status).toBe(503);
      expect(res.body?.success).toBe(false);
      expect(res.body?.message).toContain('temporarily unavailable');
      spy.mockRestore();
    });
  });

  describe('4. Vercel Serverless Entry Point ESM Compatibility & Module Loading', () => {
    it('successfully loads Express application and DB module without ERR_REQUIRE_ESM', async () => {
      const vercelModule = await import('../../../api/index.js');
      expect(vercelModule.default).toBeDefined();
      expect(typeof vercelModule.default).toBe('function');
    });

    it('executes standalone Node ESM child process loading api/index.js without ERR_REQUIRE_ESM or warnings', async () => {
      const { execSync } = await import('child_process');
      const rootPath = path.resolve(__dirname, '../../../');

      const output = execSync(
        'node -e "import(\'./api/index.js\').then(m => console.log(\'LOADED:\' + typeof m.default))"',
        { cwd: rootPath, encoding: 'utf-8' }
      );

      expect(output).toContain('LOADED:function');
      expect(output).not.toContain('ERR_REQUIRE_ESM');
      expect(output).not.toContain('MODULE_TYPELESS_PACKAGE_JSON');
    });

    it('successfully handles /api/v1/auth/csrf-token through serverless handler when DB is connected', async () => {
      if (mongoose.connection.readyState === 0) {
        await connectDB(TEST_DB_URI);
      }

      const res = await request(serverlessApp).get('/api/v1/auth/csrf-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.csrfToken).toBeDefined();
      expect(typeof res.body.data.csrfToken).toBe('string');
    });
  });
});
