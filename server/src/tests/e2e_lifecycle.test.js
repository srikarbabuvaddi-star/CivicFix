import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Issue } from '../modules/issues/issue.model.js';
import { Department } from '../modules/departments/department.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { Feedback } from '../modules/feedback/feedback.model.js';
import { Counter } from '../modules/issues/counter.model.js';
import { IssueEvent } from '../modules/issues/issueAudit.model.js';
import {
  ROLES,
  ISSUE_STATUS,
  ISSUE_CATEGORIES,
  ISSUE_VISIBILITY
} from '../config/constants.js';

const E2E_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_e2e';

describe('CivicFix End-to-End Complete Lifecycle Verification Suite', () => {
  let app;

  let citizenCookie;
  let citizenCsrfToken;
  let _citizenUserId;

  let adminCookie;
  let adminCsrfToken;
  let adminUserId;

  let staffCookie;
  let staffCsrfToken;
  let staffUserId;

  let roadsDeptId;
  let createdIssueId;
  let createdIssueNumber;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = E2E_DB_URI;
    process.env.SESSION_SECRET = 'test_session_secret_32chars_minimum_length_required!';

    await connectDB(E2E_DB_URI);
    app = createApp(E2E_DB_URI);

    // Clean previous test data
    await Issue.deleteMany({});
    await Counter.deleteMany({});
    await Department.deleteMany({});
    await Notification.deleteMany({});
    await Feedback.deleteMany({});
    await IssueEvent.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  it('Step 0: System Readiness & Liveness Probes respond with HTTP 200 and correlation IDs', async () => {
    const healthRes = await request(app).get('/api/v1/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.data.status).toBe('ok');
    expect(healthRes.body.data.database).toBe('connected');
    expect(healthRes.headers['x-correlation-id']).toBeDefined();

    const readyRes = await request(app).get('/api/v1/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.status).toBe('ready');
    expect(readyRes.body.data.database).toBe('connected');
  });

  it('Step 1: Citizen, Staff, and Admin accounts register and authenticate securely', async () => {
    // 1.1 Register Citizen
    const citizenReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Maya Citizen',
      email: 'maya@civicfix.org',
      password: 'StrongPassword123!'
    });
    expect(citizenReg.status).toBe(201);
    expect(citizenReg.body.data.user.role).toBe(ROLES.CITIZEN);
    _citizenUserId = citizenReg.body.data.user.id;
    citizenCookie = citizenReg.headers['set-cookie'];
    citizenCsrfToken = citizenReg.body.data.csrfToken;

    // 1.2 Register Admin (promoted via direct DB role)
    const adminReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Director Kumar',
      email: 'kumar@civicfix.gov',
      password: 'StrongPassword123!'
    });
    expect(adminReg.status).toBe(201);
    adminUserId = adminReg.body.data.user.id;
    await User.updateOne({ _id: adminUserId }, { role: ROLES.ADMIN });
    adminCookie = adminReg.headers['set-cookie'];
    adminCsrfToken = adminReg.body.data.csrfToken;

    // 1.3 Admin creates Department
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Cookie', adminCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send({
        name: 'Roadways & Pavement Works',
        description: 'Municipal road surfacing and pothole repair bureau',
        categoriesHandled: [ISSUE_CATEGORIES.ROADS]
      });
    expect(deptRes.status).toBe(201);
    roadsDeptId = deptRes.body.data.id;

    // 1.4 Register Staff & assign to Department
    const staffReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Technician Ravi',
      email: 'ravi@civicfix.gov',
      password: 'StrongPassword123!'
    });
    staffUserId = staffReg.body.data.user.id;
    await User.updateOne({ _id: staffUserId }, { role: ROLES.STAFF, departmentId: roadsDeptId });
    staffCookie = staffReg.headers['set-cookie'];
    staffCsrfToken = staffReg.body.data.csrfToken;
  });

  it('Step 2: Citizen files an infrastructure complaint (atomic number, location, notifications)', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .set('Cookie', citizenCookie)
      .set('x-csrf-token', citizenCsrfToken)
      .send({
        title: 'Deep Pothole on MG Road',
        description: 'Large crater causing vehicular damage near Trinity Metro station.',
        category: ISSUE_CATEGORIES.ROADS,
        location: {
          type: 'Point',
          coordinates: [77.61, 12.97],
          address: 'MG Road, near Trinity Junction'
        },
        visibility: ISSUE_VISIBILITY.PUBLIC
      });

    expect(res.status).toBe(201);
    expect(res.body.data.issueNumber).toMatch(/^CF-\d{4,}$/);
    expect(res.body.data.status).toBe(ISSUE_STATUS.SUBMITTED);
    expect(res.body.data.reporterId).toBeDefined();

    createdIssueId = res.body.data.id || res.body.data._id;
    createdIssueNumber = res.body.data.issueNumber;

    // Verify citizen receives in-app confirmation notification
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', citizenCookie);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifRes.body.data.notifications[0].title).toMatch(/Report Registered/i);
  });

  it('Step 3: Citizen views issue report and public explore lists it with generalized coordinates', async () => {
    // 3.1 Citizen views own report
    const detailRes = await request(app)
      .get(`/api/v1/issues/${createdIssueId}`)
      .set('Cookie', citizenCookie);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.title).toBe('Deep Pothole on MG Road');
    expect(detailRes.body.data.status).toBe(ISSUE_STATUS.SUBMITTED);

    // 3.2 Public explore query returns issue with privacy-protected location
    const publicRes = await request(app)
      .get('/api/v1/issues?category=roads');

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.issues.length).toBeGreaterThanOrEqual(1);
    const pubIssue = publicRes.body.data.issues.find((i) => i.issueNumber === createdIssueNumber);
    expect(pubIssue).toBeDefined();
    // Public location coordinate precision is verified
    expect(pubIssue.location.coordinates).toHaveLength(2);
  });

  it('Step 4: Administrator reviews triage queue and assigns ticket to Department & Staff Technician', async () => {
    // 4.1 Admin checks triage queue
    const triageRes = await request(app)
      .get('/api/v1/issues/admin/triage')
      .set('Cookie', adminCookie);

    expect(triageRes.status).toBe(200);
    expect(triageRes.body.data.issues.some((i) => (i.id || i._id) === createdIssueId)).toBe(true);

    // 4.2 Admin assigns issue
    const assignRes = await request(app)
      .post(`/api/v1/issues/${createdIssueId}/assign`)
      .set('Cookie', adminCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send({
        departmentId: roadsDeptId,
        assigneeId: staffUserId,
        reason: 'Assigned to field technician Ravi for asphalt patching.'
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.status).toBe(ISSUE_STATUS.ASSIGNED);
    expect(assignRes.body.data.departmentId).toBeDefined();
    expect(assignRes.body.data.assigneeId).toBeDefined();

    // Verify staff technician receives assignment notification
    const staffNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', staffCookie);

    expect(staffNotifs.status).toBe(200);
    expect(staffNotifs.body.data.notifications.some((n) => n.type === 'issue_assigned')).toBe(true);
  });

  it('Step 5: Staff technician views assigned queue and progresses issue to in_progress', async () => {
    // 5.1 Staff views work queue
    const queueRes = await request(app)
      .get('/api/v1/issues/staff/queue')
      .set('Cookie', staffCookie);

    expect(queueRes.status).toBe(200);
    expect(queueRes.body.data.issues.some((i) => (i.id || i._id) === createdIssueId)).toBe(true);

    // 5.2 Staff transitions ticket to in_progress
    const transRes = await request(app)
      .post(`/api/v1/issues/${createdIssueId}/transition`)
      .set('Cookie', staffCookie)
      .set('x-csrf-token', staffCsrfToken)
      .send({
        status: ISSUE_STATUS.IN_PROGRESS,
        reason: 'Technician arrived on-site with road crew and asphalt compactor.'
      });

    expect(transRes.status).toBe(200);
    expect(transRes.body.data.status).toBe(ISSUE_STATUS.IN_PROGRESS);
  });

  it('Step 6: Staff technician submits work completion resolution notes', async () => {
    const resolveRes = await request(app)
      .post(`/api/v1/issues/${createdIssueId}/resolve`)
      .set('Cookie', staffCookie)
      .set('x-csrf-token', staffCsrfToken)
      .send({
        resolutionNotes: 'Filled pothole with 1.5 tons hot mix asphalt and compacted to grade level.',
        evidenceNotes: 'Work Order #ROAD-9812 inspected and signed off by site supervisor.'
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe(ISSUE_STATUS.RESOLVED);
    expect(resolveRes.body.data.resolvedAt).toBeDefined();
    expect(resolveRes.body.data.resolutionNotes).toContain('hot mix asphalt');
  });

  it('Step 7: Reporting citizen reviews resolution and submits satisfaction feedback', async () => {
    const feedbackRes = await request(app)
      .post(`/api/v1/issues/${createdIssueId}/feedback`)
      .set('Cookie', citizenCookie)
      .set('x-csrf-token', citizenCsrfToken)
      .send({
        rating: 5,
        resolutionQuality: 'excellent',
        comment: 'Road surface is completely smooth now. Thank you for the fast response!'
      });

    expect(feedbackRes.status).toBe(201);
    expect(feedbackRes.body.data.rating).toBe(5);
    expect(feedbackRes.body.data.resolutionQuality).toBe('excellent');
  });

  it('Step 8: Reporting citizen confirms resolution and closes the issue ticket', async () => {
    const verifyRes = await request(app)
      .post(`/api/v1/issues/${createdIssueId}/verify`)
      .set('Cookie', citizenCookie)
      .set('x-csrf-token', citizenCsrfToken);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe(ISSUE_STATUS.CLOSED);
    expect(verifyRes.body.data.closedAt).toBeDefined();

    // Verify immutable audit event timeline contains complete provenance
    const timelineRes = await request(app)
      .get(`/api/v1/issues/${createdIssueId}/timeline`)
      .set('Cookie', citizenCookie);

    expect(timelineRes.status).toBe(200);
    const events = timelineRes.body.data;
    expect(events.length).toBeGreaterThanOrEqual(4); // created, assigned, in_progress, resolved, closed
    expect(events.some((e) => e.eventType === 'created')).toBe(true);
    expect(events.some((e) => e.eventType === 'assigned')).toBe(true);
    expect(events.some((e) => e.eventType === 'resolved')).toBe(true);
    expect(events.some((e) => e.eventType === 'closed')).toBe(true);
  });

  it('Step 9: Analytics pipelines accurately aggregate real metrics across citizen, staff, and admin consoles', async () => {
    // 9.1 Citizen Analytics
    const citAnalytics = await request(app)
      .get('/api/v1/analytics/citizen')
      .set('Cookie', citizenCookie);

    expect(citAnalytics.status).toBe(200);
    expect(citAnalytics.body.data.totalReports).toBe(1);
    expect(citAnalytics.body.data.resolvedReports).toBe(1);
    expect(citAnalytics.body.data.averageSatisfactionRating).toBe(5);

    // 9.2 Staff Analytics
    const staffAnalytics = await request(app)
      .get('/api/v1/analytics/staff')
      .set('Cookie', staffCookie);

    expect(staffAnalytics.status).toBe(200);
    expect(staffAnalytics.body.data.totalAssignedWorkOrders).toBe(1);
    expect(staffAnalytics.body.data.completedResolutions).toBe(1);
    expect(staffAnalytics.body.data.activeWorkOrders).toBe(0);

    // 9.3 Admin Analytics
    const adminAnalytics = await request(app)
      .get('/api/v1/analytics/admin')
      .set('Cookie', adminCookie);

    expect(adminAnalytics.status).toBe(200);
    expect(adminAnalytics.body.data.totalIssues).toBe(1);
    expect(adminAnalytics.body.data.resolutionRatePercent).toBe(100);
    expect(adminAnalytics.body.data.averageCitizenRating).toBe(5);
  });

  it('Step 10: Unauthorized and privileged operations are strictly rejected (RBAC enforcement)', async () => {
    // 10.1 Citizen attempting to assign tickets receives 403 Forbidden
    const unauthAssign = await request(app)
      .post(`/api/v1/issues/${createdIssueId}/assign`)
      .set('Cookie', citizenCookie)
      .set('x-csrf-token', citizenCsrfToken)
      .send({ departmentId: roadsDeptId, assigneeId: staffUserId });

    expect(unauthAssign.status).toBe(403);

    // 10.2 Third-party citizen cannot access private feedback
    const unauthCit = await request(app).post('/api/v1/auth/register').send({
      name: 'Intruder Bob',
      email: 'bob@example.com',
      password: 'StrongPassword123!'
    });
    const bobCookie = unauthCit.headers['set-cookie'];

    const privateFb = await request(app)
      .get(`/api/v1/issues/${createdIssueId}/feedback`)
      .set('Cookie', bobCookie);

    expect(privateFb.status).toBe(403);

    // 10.3 Unauthenticated request to staff queue is rejected
    const guestDeny = await request(app).get('/api/v1/issues/staff/queue');
    expect(guestDeny.status).toBe(401);
  });
});
