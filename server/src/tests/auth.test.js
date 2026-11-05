import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { ROLES, ACCOUNT_STATUS } from '../config/constants.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_automated';

describe('CivicFix Authentication & Security Integration Suite', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = TEST_DB_URI;
    process.env.SESSION_SECRET = 'test_session_secret_32chars_minimum_length_required!';

    await connectDB(TEST_DB_URI);
    app = createApp(TEST_DB_URI);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    // Clear users before each test run
    await User.deleteMany({});
  });

  describe('1. Health Check Endpoint', () => {
    it('returns service status and database state without leaking credentials', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('connected');
      // Ensure no sensitive fields
      expect(res.body.data.mongoUri).toBeUndefined();
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.secret).toBeUndefined();
    });
  });

  describe('2. Registration Endpoint (POST /api/v1/auth/register)', () => {
    it('successfully registers a new citizen account and returns safe user data', async () => {
      const payload = {
        name: 'Sarah Connor',
        email: 'Sarah.Connor@CivicFix.org',
        password: 'ValidPassword123!'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.name).toBe('Sarah Connor');
      // Verify email was normalized to lowercase
      expect(res.body.data.user.email).toBe('sarah.connor@civicfix.org');
      expect(res.body.data.user.role).toBe(ROLES.CITIZEN);
      expect(res.body.data.user.status).toBe(ACCOUNT_STATUS.ACTIVE);
      // Ensure password hash is NOT returned
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.csrfToken).toBeDefined();

      // Check session cookie was issued
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.startsWith('civicfix.sid='))).toBe(true);
      expect(cookies.some(c => c.toLowerCase().includes('httponly'))).toBe(true);

      // Verify DB record
      const dbUser = await User.findOne({ email: 'sarah.connor@civicfix.org' }).select('+passwordHash');
      expect(dbUser).not.toBeNull();
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash.startsWith('$argon2id$')).toBe(true);
    });

    it('rejects duplicate email registration with HTTP 409 Conflict', async () => {
      const payload = {
        name: 'Alex Mercer',
        email: 'alex.mercer@civicfix.org',
        password: 'StrongPassword123!'
      };

      // First registration
      const firstRes = await request(app).post('/api/v1/auth/register').send(payload);
      expect(firstRes.status).toBe(201);

      // Attempt second registration with mixed case
      const duplicatePayload = {
        name: 'Alex Mercer Duplicate',
        email: 'ALEX.MERCER@civicfix.org',
        password: 'AnotherPassword123!'
      };

      const duplicateRes = await request(app).post('/api/v1/auth/register').send(duplicatePayload);
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/already exists/i);
    });

    it('rejects invalid registration inputs with HTTP 400 and validation details', async () => {
      const invalidPayload = {
        name: 'A', // too short
        email: 'not-an-email',
        password: 'weak' // too short, no uppercase, no numbers, no special chars
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeInstanceOf(Array);
      expect(res.body.details.length).toBeGreaterThanOrEqual(3);
    });

    it('prevents role escalation during public registration (assigns citizen role only)', async () => {
      const maliciousPayload = {
        name: 'Malicious Actor',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
        departmentId: '507f1f77bcf86cd799439011'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousPayload);

      expect(res.status).toBe(201);
      // The returned user MUST be citizen
      expect(res.body.data.user.role).toBe(ROLES.CITIZEN);

      // The DB record MUST be citizen
      const dbUser = await User.findOne({ email: 'hacker@example.com' });
      expect(dbUser.role).toBe(ROLES.CITIZEN);
      expect(dbUser.departmentId).toBeNull();
    });
  });

  describe('3. Login Endpoint (POST /api/v1/auth/login)', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({
        name: 'Thomas Edison',
        email: 'edison@civicfix.org',
        password: 'LightBulb1879!'
      });
    });

    it('successfully logs in with valid credentials and sets session cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'EDISON@civicfix.org', // Case insensitive
          password: 'LightBulb1879!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('edison@civicfix.org');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.csrfToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.startsWith('civicfix.sid='))).toBe(true);
    });

    it('rejects incorrect password with generic 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'edison@civicfix.org',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects non-existent email with generic 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@civicfix.org',
          password: 'LightBulb1879!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects login when user account is suspended', async () => {
      await User.updateOne({ email: 'edison@civicfix.org' }, { status: ACCOUNT_STATUS.SUSPENDED });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'edison@civicfix.org',
          password: 'LightBulb1879!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/suspended/i);
    });
  });

  describe('4. Session Persistence & /auth/me Endpoint', () => {
    it('persists session across requests via session cookie', async () => {
      // 1. Login
      await request(app).post('/api/v1/auth/register').send({
        name: 'Marie Curie',
        email: 'marie.curie@civicfix.org',
        password: 'RadiumDiscovery1898!'
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'marie.curie@civicfix.org',
          password: 'RadiumDiscovery1898!'
        });

      const sessionCookie = loginRes.headers['set-cookie'];

      // 2. Access /api/v1/auth/me with session cookie
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', sessionCookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('marie.curie@civicfix.org');
      expect(meRes.body.data.user.name).toBe('Marie Curie');
      expect(meRes.body.data.user.role).toBe(ROLES.CITIZEN);
      expect(meRes.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects unauthenticated request to /auth/me with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });
  });

  describe('5. Logout & Session Invalidation (POST /api/v1/auth/logout)', () => {
    it('invalidates the session on logout so subsequent requests are rejected', async () => {
      // 1. Register & login
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Nikola Tesla',
        email: 'tesla@civicfix.org',
        password: 'AlternatingCurrent1887!'
      });

      const sessionCookie = regRes.headers['set-cookie'];
      const csrfToken = regRes.body.data.csrfToken;

      // 2. Verify active session
      const verifyRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', sessionCookie);
      expect(verifyRes.status).toBe(200);

      // 3. Logout (providing CSRF token)
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // 4. Attempt to access /auth/me with previous cookie
      const meAfterLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', sessionCookie);

      expect(meAfterLogout.status).toBe(401);
    });
  });

  describe('6. Role Authorization & Access Control', () => {
    it('denies citizen access to staff portal with HTTP 403 Forbidden', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Normal Citizen',
        email: 'citizen@civicfix.org',
        password: 'StandardUser123!'
      });

      const sessionCookie = regRes.headers['set-cookie'];

      const portalRes = await request(app)
        .get('/api/v1/users/staff-portal')
        .set('Cookie', sessionCookie);

      expect(portalRes.status).toBe(403);
      expect(portalRes.body.success).toBe(false);
      expect(portalRes.body.message).toMatch(/forbidden/i);
    });

    it('allows staff user to access staff portal but denies admin portal', async () => {
      // Create staff user directly in database (simulating administrative provisioning)
      const _staffUser = await User.create({
        name: 'Staff Inspector',
        email: 'staff.inspector@civicfix.gov',
        passwordHash: 'dummyHash',
        role: ROLES.STAFF,
        status: ACCOUNT_STATUS.ACTIVE
      });

      // Login as staff
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Temp Staff',
        email: 'temp.staff@civicfix.org',
        password: 'Password123!'
      });

      // Update role to staff
      await User.updateOne({ email: 'temp.staff@civicfix.org' }, { role: ROLES.STAFF });

      const sessionCookie = regRes.headers['set-cookie'];

      // Access staff portal -> OK
      const staffRes = await request(app)
        .get('/api/v1/users/staff-portal')
        .set('Cookie', sessionCookie);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.role).toBe(ROLES.STAFF);

      // Access admin portal -> 403 Forbidden
      const adminRes = await request(app)
        .get('/api/v1/users/admin-portal')
        .set('Cookie', sessionCookie);
      expect(adminRes.status).toBe(403);
    });
  });

  describe('7. CSRF Protection for State-Changing Requests', () => {
    it('rejects state-changing mutating requests if CSRF token is missing on active session', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'CSRF Tester',
        email: 'csrf.tester@civicfix.org',
        password: 'StrongPassword123!'
      });

      const sessionCookie = regRes.headers['set-cookie'];

      // Attempt logout without x-csrf-token header
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/CSRF token/i);
    });

    it('rejects state-changing request if CSRF token is invalid/tampered', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'CSRF Tamper',
        email: 'csrf.tamper@civicfix.org',
        password: 'StrongPassword123!'
      });

      const sessionCookie = regRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', 'tampered_invalid_csrf_token_value');

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/CSRF/i);
    });
  });
});
