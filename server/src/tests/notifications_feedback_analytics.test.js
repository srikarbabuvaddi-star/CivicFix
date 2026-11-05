import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
import { sendTransactionalEmail } from '../services/emailService.js';
import {
  ROLES,
  ISSUE_STATUS,
  ISSUE_CATEGORIES,
  ISSUE_VISIBILITY
} from '../config/constants.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_automated';

describe('CivicFix Notifications, Feedback, Email & Analytics Suite', () => {
  let app;

  let adminCookie;
  let _adminCsrfToken;
  let adminUserId;

  let staffCookie;
  let _staffCsrfToken;
  let staffUserId;

  let citizenCookie;
  let citizenCsrfToken;
  let citizenUserId;

  let otherCitizenCookie;
  let otherCitizenCsrfToken;
  let otherCitizenUserId;

  let roadsDeptId;

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
    await Department.deleteMany({});
    await Notification.deleteMany({});
    await Feedback.deleteMany({});
    await IssueEvent.deleteMany({});
    await User.deleteMany({});

    // 1. Create Admin
    const adminReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Super Admin',
      email: 'admin@civicfix.gov',
      password: 'StrongPassword123!'
    });
    adminUserId = adminReg.body.data.user.id;
    await User.updateOne({ _id: adminUserId }, { role: ROLES.ADMIN });
    adminCookie = adminReg.headers['set-cookie'];
    _adminCsrfToken = adminReg.body.data.csrfToken;

    // 2. Create Roads Department
    const dept = await Department.create({
      name: 'Roadways Bureau',
      normalizedName: 'roadways bureau',
      categoriesHandled: [ISSUE_CATEGORIES.ROADS]
    });
    roadsDeptId = dept._id.toString();

    // 3. Create Staff
    const staffReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Technician Frank',
      email: 'frank@civicfix.gov',
      password: 'StrongPassword123!'
    });
    staffUserId = staffReg.body.data.user.id;
    await User.updateOne({ _id: staffUserId }, { role: ROLES.STAFF, departmentId: roadsDeptId });
    staffCookie = staffReg.headers['set-cookie'];
    _staffCsrfToken = staffReg.body.data.csrfToken;

    // 4. Create Citizen 1 (primary reporter)
    const cit1Reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Reporter',
      email: 'alice@example.com',
      password: 'StrongPassword123!'
    });
    citizenUserId = cit1Reg.body.data.user.id;
    citizenCookie = cit1Reg.headers['set-cookie'];
    citizenCsrfToken = cit1Reg.body.data.csrfToken;

    // 5. Create Citizen 2 (unrelated)
    const cit2Reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Unrelated',
      email: 'bob@example.com',
      password: 'StrongPassword123!'
    });
    otherCitizenUserId = cit2Reg.body.data.user.id;
    otherCitizenCookie = cit2Reg.headers['set-cookie'];
    otherCitizenCsrfToken = cit2Reg.body.data.csrfToken;
  });

  describe('1. Notification System & Ownership Isolation', () => {
    it('automatically generates an in-app notification when an issue is created', async () => {
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Damaged Sidewalk Ramp',
          description: 'Curb cut broken and wheelchair inaccessible.',
          category: ISSUE_CATEGORIES.ROADS,
          location: { type: 'Point', coordinates: [77.59, 12.97], address: 'Library corner' },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      expect(issueRes.status).toBe(201);

      // Verify unread count for Alice
      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', citizenCookie);

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unreadCount).toBe(1);

      // Verify notification details
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', citizenCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.notifications).toHaveLength(1);
      const notif = listRes.body.data.notifications[0];
      expect(notif.title).toMatch(/Report Registered/i);
      expect(notif.readAt).toBeNull();
      expect(notif.relatedIssueId).toBeDefined();
    });

    it('enforces notification ownership: other citizens cannot see or mark notifications', async () => {
      // Create issue as Alice
      await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Water Leak on 2nd Ave',
          description: 'High pressure municipal water pipe leaking onto roadway.',
          category: ISSUE_CATEGORIES.ROADS,
          location: { type: 'Point', coordinates: [77.59, 12.97] }
        });

      // Query Bob's notifications
      const bobRes = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', otherCitizenCookie);

      expect(bobRes.status).toBe(200);
      expect(bobRes.body.data.notifications).toHaveLength(0);

      // Alice's notification
      const aliceNotif = await Notification.findOne({ recipientId: citizenUserId });
      expect(aliceNotif).not.toBeNull();

      // Bob tries to mark Alice's notification as read
      const markRes = await request(app)
        .patch(`/api/v1/notifications/${aliceNotif._id}/read`)
        .set('Cookie', otherCitizenCookie)
        .set('x-csrf-token', otherCitizenCsrfToken);

      expect(markRes.status).toBe(404);
    });

    it('marks a single notification as read and supports mark-all-read', async () => {
      // Create 2 notifications directly
      const issue = await Issue.create({
        issueNumber: 'CF-3001',
        title: 'Broken Streetlamp',
        description: 'Dark junction at night',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
        reporterId: citizenUserId
      });

      const n1 = await Notification.create({
        recipientId: citizenUserId,
        type: 'issue_submitted',
        title: 'Report 1',
        message: 'Message 1',
        relatedIssueId: issue._id
      });

      await Notification.create({
        recipientId: citizenUserId,
        type: 'issue_assigned',
        title: 'Report 2',
        message: 'Message 2',
        relatedIssueId: issue._id
      });

      // Mark single read
      const markOneRes = await request(app)
        .patch(`/api/v1/notifications/${n1._id}/read`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken);

      expect(markOneRes.status).toBe(200);
      expect(markOneRes.body.data.readAt).not.toBeNull();

      // Unread count should now be 1
      const countRes1 = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', citizenCookie);
      expect(countRes1.body.data.unreadCount).toBe(1);

      // Mark all read
      const markAllRes = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken);

      expect(markAllRes.status).toBe(200);
      expect(markAllRes.body.data.modifiedCount).toBe(1);

      // Unread count should now be 0
      const countRes2 = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', citizenCookie);
      expect(countRes2.body.data.unreadCount).toBe(0);
    });
  });

  describe('2. Email Integration & Safe Fallback', () => {
    it('handles email disabled/fallback gracefully without throwing unhandled exceptions', async () => {
      const result = await sendTransactionalEmail({
        to: 'citizen@example.com',
        subject: 'Test Notification',
        title: 'Test Notification Title',
        body: 'Safe body content without secrets'
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toMatch(/^simulated-/);
    });

    it('allows users to retrieve and update their notification preferences', async () => {
      // Get initial preferences
      const getRes = await request(app)
        .get('/api/v1/users/preferences')
        .set('Cookie', citizenCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.email).toBe(true);
      expect(getRes.body.data.inApp).toBe(true);

      // Disable email notifications
      const patchRes = await request(app)
        .patch('/api/v1/users/preferences')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({ email: false, inApp: true });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.email).toBe(false);
      expect(patchRes.body.data.inApp).toBe(true);
    });
  });

  describe('3. Citizen Feedback & Resolution Evaluation', () => {
    let resolvedIssueId;

    beforeEach(async () => {
      const issue = await Issue.create({
        issueNumber: 'CF-4001',
        title: 'Pothole Fixed by Crew',
        description: 'Road damage repair test',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
        reporterId: citizenUserId,
        departmentId: roadsDeptId,
        assigneeId: staffUserId,
        status: ISSUE_STATUS.RESOLVED,
        resolutionNotes: 'Filled and leveled with hot mix asphalt.'
      });
      resolvedIssueId = issue._id.toString();
    });

    it('allows reporting citizen to submit satisfaction feedback on resolved issue', async () => {
      const res = await request(app)
        .post(`/api/v1/issues/${resolvedIssueId}/feedback`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          rating: 5,
          comment: 'Outstanding repair work. Completed within 24 hours of report!',
          resolutionQuality: 'excellent'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.resolutionQuality).toBe('excellent');
      expect(res.body.data.comment).toMatch(/outstanding repair work/i);
    });

    it('rejects invalid feedback ratings (less than 1 or greater than 5)', async () => {
      const res1 = await request(app)
        .post(`/api/v1/issues/${resolvedIssueId}/feedback`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({ rating: 0 });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post(`/api/v1/issues/${resolvedIssueId}/feedback`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({ rating: 6 });
      expect(res2.status).toBe(400);
    });

    it('rejects feedback on an issue that has not been resolved (e.g. submitted status)', async () => {
      const unresIssue = await Issue.create({
        issueNumber: 'CF-4002',
        title: 'Unresolved Problem',
        description: 'Still pending inspection',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
        reporterId: citizenUserId,
        status: ISSUE_STATUS.SUBMITTED
      });

      const res = await request(app)
        .post(`/api/v1/issues/${unresIssue._id}/feedback`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({ rating: 4 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only be submitted for resolved or closed/i);
    });

    it('rejects an unrelated citizen from submitting feedback on another citizen’s report (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/issues/${resolvedIssueId}/feedback`)
        .set('Cookie', otherCitizenCookie)
        .set('x-csrf-token', otherCitizenCsrfToken)
        .send({ rating: 4 });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only the original citizen reporter/i);
    });

    it('prevents third-party public viewers from accessing private citizen feedback', async () => {
      await Feedback.create({
        issueId: resolvedIssueId,
        citizenId: citizenUserId,
        rating: 5,
        comment: 'Confidential feedback note'
      });

      // Bob tries to query feedback for Alice's issue
      const res = await request(app)
        .get(`/api/v1/issues/${resolvedIssueId}/feedback`)
        .set('Cookie', otherCitizenCookie);

      expect(res.status).toBe(403);
    });
  });

  describe('4. Operational Analytics Engine & Role Gates', () => {
    beforeEach(async () => {
      // Create test dataset
      const issue1 = await Issue.create({
        issueNumber: 'CF-5001',
        title: 'Road Issue 1',
        description: 'Description 1',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
        reporterId: citizenUserId,
        departmentId: roadsDeptId,
        assigneeId: staffUserId,
        status: ISSUE_STATUS.RESOLVED,
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        resolvedAt: new Date()
      });

      await Issue.create({
        issueNumber: 'CF-5002',
        title: 'Road Issue 2',
        description: 'Description 2',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
        reporterId: citizenUserId,
        departmentId: roadsDeptId,
        assigneeId: staffUserId,
        status: ISSUE_STATUS.IN_PROGRESS
      });

      await Feedback.create({
        issueId: issue1._id,
        citizenId: citizenUserId,
        rating: 5,
        resolutionQuality: 'excellent'
      });
    });

    it('returns citizen-specific analytics strictly isolated to the requesting citizen', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/citizen')
        .set('Cookie', citizenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.totalReports).toBe(2);
      expect(res.body.data.resolvedReports).toBe(1);
      expect(res.body.data.statusBreakdown.resolved).toBe(1);
      expect(res.body.data.statusBreakdown.in_progress).toBe(1);
      expect(res.body.data.averageSatisfactionRating).toBe(5);

      // Bob should have 0 reports
      const bobRes = await request(app)
        .get('/api/v1/analytics/citizen')
        .set('Cookie', otherCitizenCookie);
      expect(bobRes.body.data.totalReports).toBe(0);
    });

    it('returns staff technician workload analytics and enforces role authorization', async () => {
      // Citizen cannot access staff analytics
      const citDeny = await request(app)
        .get('/api/v1/analytics/staff')
        .set('Cookie', citizenCookie);
      expect(citDeny.status).toBe(403);

      // Staff user receives their assigned workload
      const staffRes = await request(app)
        .get('/api/v1/analytics/staff')
        .set('Cookie', staffCookie);

      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.totalAssignedWorkOrders).toBe(2);
      expect(staffRes.body.data.completedResolutions).toBe(1);
      expect(staffRes.body.data.activeWorkOrders).toBe(1);
      expect(staffRes.body.data.averageResolutionHours).toBeGreaterThan(0);
    });

    it('returns platform-wide administrator analytics and protects admin endpoint', async () => {
      // Non-admin denied
      const staffDeny = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Cookie', staffCookie);
      expect(staffDeny.status).toBe(403);

      // Admin receives complete telemetry
      const adminRes = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Cookie', adminCookie);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.totalIssues).toBe(2);
      expect(adminRes.body.data.resolutionRatePercent).toBe(50);
      expect(adminRes.body.data.categoryBreakdown.roads).toBe(2);
      expect(adminRes.body.data.departmentWorkload).toHaveLength(1);
      expect(adminRes.body.data.averageCitizenRating).toBe(5);
    });
  });

  describe('5. Geographic Hotspots & Location Privacy Thresholds', () => {
    it('aggregates clusters meeting the minimum privacy threshold (>= 2 reports) and omits single isolated points', async () => {
      // Create cluster of 2 issues near [77.59, 12.97]
      await Issue.create({
        issueNumber: 'CF-6001',
        title: 'Cluster Report A',
        description: 'Cluster report description A',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.591, 12.971] },
        reporterId: citizenUserId,
        visibility: ISSUE_VISIBILITY.PUBLIC,
        status: ISSUE_STATUS.SUBMITTED
      });

      await Issue.create({
        issueNumber: 'CF-6002',
        title: 'Cluster Report B',
        description: 'Cluster report description B',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.592, 12.972] },
        reporterId: citizenUserId,
        visibility: ISSUE_VISIBILITY.PUBLIC,
        status: ISSUE_STATUS.SUBMITTED
      });

      // Create a single isolated issue far away at [77.10, 12.10]
      await Issue.create({
        issueNumber: 'CF-6003',
        title: 'Isolated Remote Report',
        description: 'Single isolated home',
        category: ISSUE_CATEGORIES.WATER,
        location: { type: 'Point', coordinates: [77.101, 12.102] },
        reporterId: otherCitizenUserId,
        visibility: ISSUE_VISIBILITY.PUBLIC,
        status: ISSUE_STATUS.SUBMITTED
      });

      const res = await request(app)
        .get('/api/v1/analytics/hotspots?minThreshold=2')
        .set('Cookie', citizenCookie);

      expect(res.status).toBe(200);
      // The cluster near [77.59, 12.97] has count=2 and is returned
      // The isolated issue at [77.10, 12.10] has count=1 and is OMITTED per the location privacy policy
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].count).toBe(2);
      expect(res.body.data[0].primaryCategory).toBe(ISSUE_CATEGORIES.ROADS);
    });
  });
});
