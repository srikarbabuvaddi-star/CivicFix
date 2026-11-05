import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Issue } from '../modules/issues/issue.model.js';
import { Counter } from '../modules/issues/counter.model.js';
import {
  ROLES,
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  ISSUE_VISIBILITY,
  ISSUE_CATEGORIES
} from '../config/constants.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_automated';

describe('CivicFix Issue Reporting & Management Integration Suite', () => {
  let app;
  let citizenCookie;
  let citizenCsrfToken;
  let citizenUserId;

  let otherCitizenCookie;
  let otherCitizenCsrfToken;
  let _otherCitizenUserId;

  let staffCookie;
  let _staffCsrfToken;

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
    await Issue.deleteMany({});
    await Counter.deleteMany({});
    await User.deleteMany({});

    // 1. Register main citizen
    const regRes1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Citizen',
      email: 'alice@civicfix.org',
      password: 'StrongPassword123!'
    });
    citizenCookie = regRes1.headers['set-cookie'];
    citizenCsrfToken = regRes1.body.data.csrfToken;
    citizenUserId = regRes1.body.data.user.id;

    // 2. Register secondary citizen
    const regRes2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Resident',
      email: 'bob@civicfix.org',
      password: 'StrongPassword123!'
    });
    otherCitizenCookie = regRes2.headers['set-cookie'];
    otherCitizenCsrfToken = regRes2.body.data.csrfToken;
    _otherCitizenUserId = regRes2.body.data.user.id;

    // 3. Register and promote staff user
    const regRes3 = await request(app).post('/api/v1/auth/register').send({
      name: 'Inspector Morse',
      email: 'morse@civicfix.gov',
      password: 'StrongPassword123!'
    });
    await User.updateOne({ email: 'morse@civicfix.gov' }, { role: ROLES.STAFF });
    staffCookie = regRes3.headers['set-cookie'];
    _staffCsrfToken = regRes3.body.data.csrfToken;
  });

  describe('1. Issue Creation (POST /api/v1/issues)', () => {
    it('successfully creates an issue report with human-readable issue number', async () => {
      const payload = {
        title: 'Deep Pothole on Main Street',
        description: 'Large hazardous pothole near 5th cross road causing vehicular damage.',
        category: ISSUE_CATEGORIES.ROADS,
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
          address: 'Main Street near 5th Cross'
        },
        visibility: ISSUE_VISIBILITY.PUBLIC
      };

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.issueNumber).toMatch(/^CF-\d+$/);
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.category).toBe(ISSUE_CATEGORIES.ROADS);
      expect(res.body.data.status).toBe(ISSUE_STATUS.SUBMITTED);
      expect(res.body.data.priority).toBe(ISSUE_PRIORITY.NORMAL);
      expect(res.body.data.reporterId).toBe(citizenUserId);
      expect(res.body.data.location.coordinates).toEqual([77.5946, 12.9716]);
    });

    it('rejects unauthenticated issue submission with HTTP 401 Unauthorized', async () => {
      const payload = {
        title: 'Broken Streetlight',
        description: 'Streetlight has been flickering and completely turned dark.',
        category: ISSUE_CATEGORIES.STREETLIGHT,
        location: {
          coordinates: [77.5946, 12.9716]
        }
      };

      const res = await request(app).post('/api/v1/issues').send(payload);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid category with HTTP 400 Bad Request', async () => {
      const payload = {
        title: 'Noise Issue Downtown',
        description: 'Excessive construction noise during late hours.',
        category: 'entertainment_unsupported_category',
        location: {
          coordinates: [77.5946, 12.9716]
        }
      };

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeDefined();
    });

    it('rejects invalid coordinates with out-of-range values', async () => {
      const payload = {
        title: 'Valid Title Here',
        description: 'Valid description for testing out of range coordinates.',
        category: ISSUE_CATEGORIES.WATER,
        location: {
          coordinates: [200.0, 95.0] // Out of range longitude and latitude
        }
      };

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('rejects missing required fields (empty title or description)', async () => {
      const payload = {
        title: '',
        description: '',
        category: ISSUE_CATEGORIES.ROADS,
        location: {
          coordinates: [77.5946, 12.9716]
        }
      };

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects client attempts to inject privileged fields (reporterId, status, priority, issueNumber)', async () => {
      const maliciousPayload = {
        title: 'Tampered Issue Request',
        description: 'Attempting to inject administrative fields into request payload.',
        category: ISSUE_CATEGORIES.WASTE,
        location: {
          coordinates: [77.5946, 12.9716]
        },
        reporterId: new mongoose.Types.ObjectId().toString(),
        status: ISSUE_STATUS.RESOLVED,
        priority: ISSUE_PRIORITY.URGENT,
        issueNumber: 'CF-CUSTOM-999'
      };

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(maliciousPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.some(d => d.message.includes('privileged'))).toBe(true);
    });

    it('generates sequential unique issue numbers even across multiple submissions', async () => {
      const basePayload = {
        title: 'Sequential Issue Test',
        description: 'Testing human readable atomic issue number sequence.',
        category: ISSUE_CATEGORIES.DRAINAGE,
        location: { coordinates: [77.5, 12.9] }
      };

      const res1 = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(basePayload);

      const res2 = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(basePayload);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.data.issueNumber).not.toEqual(res2.body.data.issueNumber);
    });
  });

  describe('2. Citizen Reports Isolation (GET /api/v1/issues/mine)', () => {
    beforeEach(async () => {
      // Alice creates 2 issues
      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: "Alice's First Report",
          description: 'Description for report 1 by Alice citizen.',
          category: ISSUE_CATEGORIES.ROADS,
          location: { coordinates: [77.1, 12.1] }
        });

      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: "Alice's Second Report",
          description: 'Description for report 2 by Alice citizen.',
          category: ISSUE_CATEGORIES.WATER,
          location: { coordinates: [77.2, 12.2] }
        });

      // Bob creates 1 issue
      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', otherCitizenCookie)
        .set('x-csrf-token', otherCitizenCsrfToken)
        .send({
          title: "Bob's Waste Report",
          description: 'Description for report submitted by Bob.',
          category: ISSUE_CATEGORIES.WASTE,
          location: { coordinates: [77.3, 12.3] }
        });
    });

    it("returns only the authenticated citizen's issues in /issues/mine", async () => {
      const res = await request(app)
        .get('/api/v1/issues/mine')
        .set('Cookie', citizenCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.issues.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);

      // Verify none of Bob's issues appear
      const titles = res.body.data.issues.map((i) => i.title);
      expect(titles).toContain("Alice's First Report");
      expect(titles).toContain("Alice's Second Report");
      expect(titles).not.toContain("Bob's Waste Report");
    });

    it('supports category filtering in /issues/mine', async () => {
      const res = await request(app)
        .get(`/api/v1/issues/mine?category=${ISSUE_CATEGORIES.WATER}`)
        .set('Cookie', citizenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.issues.length).toBe(1);
      expect(res.body.data.issues[0].title).toBe("Alice's Second Report");
    });
  });

  describe('3. Issue Details & Privacy Authorization (GET /api/v1/issues/:id)', () => {
    let publicIssueId;
    let privateIssueId;

    beforeEach(async () => {
      // Alice creates 1 public issue
      const pubRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Public Overflowing Dumpster',
          description: 'Dumpster on 4th block is completely overflowing.',
          category: ISSUE_CATEGORIES.WASTE,
          location: { coordinates: [77.5, 12.9], address: '4th Block Corner' },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      publicIssueId = pubRes.body.data.id;

      // Alice creates 1 private issue
      const privRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Private Property Drainage Dispute',
          description: 'Drainage pipe leaking into private residential driveway.',
          category: ISSUE_CATEGORIES.DRAINAGE,
          location: { coordinates: [77.6, 13.0], address: '12 Residential Enclave' },
          visibility: ISSUE_VISIBILITY.PRIVATE
        });
      privateIssueId = privRes.body.data.id;
    });

    it('allows the reporting citizen to view their own private issue with canEdit flag', async () => {
      const res = await request(app)
        .get(`/api/v1/issues/${privateIssueId}`)
        .set('Cookie', citizenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Private Property Drainage Dispute');
      expect(res.body.data.canEdit).toBe(true);
      expect(res.body.data.canWithdraw).toBe(true);
    });

    it('rejects another citizen attempting to view a private issue with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/issues/${privateIssueId}`)
        .set('Cookie', otherCitizenCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('allows staff to view private issues with internal operational details', async () => {
      const res = await request(app)
        .get(`/api/v1/issues/${privateIssueId}`)
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.priority).toBeDefined();
    });

    it('allows unauthenticated visitors to view public issues using the public DTO', async () => {
      const res = await request(app).get(`/api/v1/issues/${publicIssueId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Public Overflowing Dumpster');
      expect(res.body.data.issueNumber).toBeDefined();

      // Ensure private reporter details are NOT exposed in public DTO
      expect(res.body.data.reporterId).toBeUndefined();
      expect(res.body.data.reporterEmail).toBeUndefined();
      expect(res.body.data.priority).toBeUndefined();
    });

    it('rejects unauthenticated visitors attempting to view private issues with HTTP 403', async () => {
      const res = await request(app).get(`/api/v1/issues/${privateIssueId}`);
      expect(res.status).toBe(403);
    });
  });

  describe('4. Issue Update Restrictions (PATCH /api/v1/issues/:id)', () => {
    let issueId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Damaged Sidewalk Pavement',
          description: 'Pedestrians tripping over raised cement slab on sidewalk.',
          category: ISSUE_CATEGORIES.ROADS,
          location: { coordinates: [77.5, 12.9] }
        });
      issueId = res.body.data.id;
    });

    it('permits the citizen to edit title and description of their submitted report', async () => {
      const updatePayload = {
        title: 'Severely Damaged Sidewalk Pavement Updated',
        description: 'Pedestrians and elderly tripping over broken slab on sidewalk near market.'
      };

      const res = await request(app)
        .patch(`/api/v1/issues/${issueId}`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe(updatePayload.title);
      expect(res.body.data.description).toBe(updatePayload.description);
    });

    it('rejects another citizen attempting to edit a report with HTTP 403 Forbidden', async () => {
      const updatePayload = {
        title: 'Unauthorized Modification Attempt'
      };

      const res = await request(app)
        .patch(`/api/v1/issues/${issueId}`)
        .set('Cookie', otherCitizenCookie)
        .set('x-csrf-token', otherCitizenCsrfToken)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only edit your own reports/i);
    });

    it('rejects report editing once the status has progressed beyond submitted', async () => {
      // Simulate staff acknowledging or putting issue in progress
      await Issue.updateOne({ _id: issueId }, { status: ISSUE_STATUS.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/v1/issues/${issueId}`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({ title: 'Attempt to Change In-Progress Issue' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/beyond submitted/i);
    });
  });

  describe('5. Controlled Report Withdrawal (DELETE /api/v1/issues/:id)', () => {
    let issueId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Accidental Duplicate Submission',
          description: 'Submitted accidentally twice, requesting cancellation.',
          category: ISSUE_CATEGORIES.OTHER,
          location: { coordinates: [77.5, 12.9] }
        });
      issueId = res.body.data.id;
    });

    it('allows reporting citizen to withdraw submitted issue, updating status to withdrawn', async () => {
      const res = await request(app)
        .delete(`/api/v1/issues/${issueId}`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.WITHDRAWN);

      // Verify in DB that document is preserved with withdrawn status
      const dbIssue = await Issue.findById(issueId);
      expect(dbIssue).not.toBeNull();
      expect(dbIssue.status).toBe(ISSUE_STATUS.WITHDRAWN);
    });

    it('rejects another citizen attempting to withdraw an issue with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/issues/${issueId}`)
        .set('Cookie', otherCitizenCookie)
        .set('x-csrf-token', otherCitizenCsrfToken);

      expect(res.status).toBe(403);
    });
  });

  describe('6. Public Explore & Bounded Search (GET /api/v1/issues)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Dangerous Electric Cable Hanging',
          description: 'Live electric cable hanging near elementary school playground.',
          category: ISSUE_CATEGORIES.STREETLIGHT,
          location: { coordinates: [77.5, 12.9] },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });

      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Water Pipe Burst at Sector 4',
          description: 'Major drinking water pipe burst flooding public road.',
          category: ISSUE_CATEGORIES.WATER,
          location: { coordinates: [77.6, 12.8] },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });

      // Private issue (must NOT appear in public explore)
      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Confidential Internal Problem',
          description: 'Private resident grievance.',
          category: ISSUE_CATEGORIES.OTHER,
          location: { coordinates: [77.7, 12.7] },
          visibility: ISSUE_VISIBILITY.PRIVATE
        });
    });

    it('lists only public issues, omitting private issues', async () => {
      const res = await request(app).get('/api/v1/issues');

      expect(res.status).toBe(200);
      expect(res.body.data.issues.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);

      const titles = res.body.data.issues.map(i => i.title);
      expect(titles).toContain('Dangerous Electric Cable Hanging');
      expect(titles).toContain('Water Pipe Burst at Sector 4');
      expect(titles).not.toContain('Confidential Internal Problem');
    });

    it('supports bounded text search by title and issueNumber', async () => {
      const res = await request(app).get('/api/v1/issues?search=Cable');

      expect(res.status).toBe(200);
      expect(res.body.data.issues.length).toBe(1);
      expect(res.body.data.issues[0].title).toBe('Dangerous Electric Cable Hanging');
    });

    it('enforces pagination bounds (page and limit)', async () => {
      const res = await request(app).get('/api/v1/issues?page=1&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.data.issues.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.hasNextPage).toBe(true);
    });
  });
});
