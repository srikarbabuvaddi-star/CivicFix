import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Issue } from '../modules/issues/issue.model.js';
import { Department } from '../modules/departments/department.model.js';
import { IssueEvent } from '../modules/issues/issueAudit.model.js';
import { Counter } from '../modules/issues/counter.model.js';
import {
  ROLES,
  ISSUE_STATUS,
  ISSUE_CATEGORIES,
  ISSUE_VISIBILITY,
  AUDIT_EVENT_TYPE
} from '../config/constants.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_automated';

describe('CivicFix Department, Staff Management & Issue Lifecycle Suite', () => {
  let app;

  let adminCookie;
  let adminCsrfToken;
  let adminUserId;

  let staff1Cookie;
  let staff1CsrfToken;
  let staff1UserId;

  let staff2Cookie;
  let _staff2CsrfToken;
  let staff2UserId;

  let citizenCookie;
  let citizenCsrfToken;
  let citizenUserId;

  let otherCitizenCookie;
  let otherCitizenCsrfToken;
  let _otherCitizenUserId;

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
    adminCsrfToken = adminReg.body.data.csrfToken;

    // 2. Create Staff 1
    const staff1Reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Technician Dave',
      email: 'dave@civicfix.gov',
      password: 'StrongPassword123!'
    });
    staff1UserId = staff1Reg.body.data.user.id;
    await User.updateOne({ _id: staff1UserId }, { role: ROLES.STAFF });
    staff1Cookie = staff1Reg.headers['set-cookie'];
    staff1CsrfToken = staff1Reg.body.data.csrfToken;

    // 3. Create Staff 2
    const staff2Reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Technician Sarah',
      email: 'sarah@civicfix.gov',
      password: 'StrongPassword123!'
    });
    staff2UserId = staff2Reg.body.data.user.id;
    await User.updateOne({ _id: staff2UserId }, { role: ROLES.STAFF });
    staff2Cookie = staff2Reg.headers['set-cookie'];
    _staff2CsrfToken = staff2Reg.body.data.csrfToken;

    // 4. Create Citizen 1 (reporter)
    const cit1Reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Jane Citizen',
      email: 'jane@example.com',
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
    _otherCitizenUserId = cit2Reg.body.data.user.id;
    otherCitizenCookie = cit2Reg.headers['set-cookie'];
    otherCitizenCsrfToken = cit2Reg.body.data.csrfToken;
  });

  describe('1. Department Management (CRUD, Normalization, Safe Deactivation)', () => {
    it('allows Admin to create a new department with categories handled', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Roads & Infrastructure',
          description: 'Maintains city asphalt, bridges and street signage',
          categoriesHandled: [ISSUE_CATEGORIES.ROADS, ISSUE_CATEGORIES.STREETLIGHT],
          serviceArea: 'Metro Central'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Roads & Infrastructure');
      expect(res.body.data.normalizedName).toBe('roads & infrastructure');
      expect(res.body.data.isActive).toBe(true);
    });

    it('rejects duplicate department name even with different case or whitespace (409 Conflict)', async () => {
      await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Water Management',
          description: 'Potable water supply and pipeline maintenance',
          categoriesHandled: [ISSUE_CATEGORIES.WATER]
        });

      // Attempt duplicate with different casing and spacing
      const dupRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: '  water management  ',
          description: 'Duplicate department test',
          categoriesHandled: [ISSUE_CATEGORIES.WATER]
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toMatch(/already exists/i);
    });

    it('rejects non-admin (citizen, staff) from creating departments (403 Forbidden)', async () => {
      const citRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          name: 'Unauthorized Dept',
          categoriesHandled: [ISSUE_CATEGORIES.WASTE]
        });
      expect(citRes.status).toBe(403);

      const staffRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({
          name: 'Unauthorized Staff Dept',
          categoriesHandled: [ISSUE_CATEGORIES.WASTE]
        });
      expect(staffRes.status).toBe(403);
    });

    it('allows Admin to update and deactivate a department', async () => {
      const createRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Waste Management',
          description: 'Sanitation department',
          categoriesHandled: [ISSUE_CATEGORIES.WASTE]
        });
      const deptId = createRes.body.data.id;

      const updateRes = await request(app)
        .patch(`/api/v1/departments/${deptId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          description: 'Updated sanitation description',
          isActive: false
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated sanitation description');
      expect(updateRes.body.data.isActive).toBe(false);
    });

    it('suggests a department based on issue category', async () => {
      await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Drainage Department',
          categoriesHandled: [ISSUE_CATEGORIES.DRAINAGE]
        });

      const res = await request(app)
        .get(`/api/v1/departments/suggest/${ISSUE_CATEGORIES.DRAINAGE}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.name).toBe('Drainage Department');
    });

    it('prevents destructive deletion of a department referenced by issues (409 Conflict)', async () => {
      const deptRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Electrical Works',
          categoriesHandled: [ISSUE_CATEGORIES.STREETLIGHT]
        });
      const deptId = deptRes.body.data.id;

      // Create an issue referencing this department
      await Issue.create({
        issueNumber: 'CF-9999',
        title: 'Broken Streetlight',
        description: 'Dark alleyway at night',
        category: ISSUE_CATEGORIES.STREETLIGHT,
        location: { type: 'Point', coordinates: [77.59, 12.97], address: '5th Ave' },
        reporterId: citizenUserId,
        departmentId: deptId,
        status: ISSUE_STATUS.SUBMITTED
      });

      const delRes = await request(app)
        .delete(`/api/v1/departments/${deptId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken);

      expect(delRes.status).toBe(409);
      expect(delRes.body.message).toMatch(/cannot delete/i);
    });

    it('prevents destructive deletion of a department referenced by staff members (409 Conflict)', async () => {
      const deptRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Public Health',
          categoriesHandled: [ISSUE_CATEGORIES.OTHER]
        });
      const deptId = deptRes.body.data.id;

      // Assign staff to this department
      await User.updateOne({ _id: staff1UserId }, { departmentId: deptId });

      const delRes = await request(app)
        .delete(`/api/v1/departments/${deptId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken);

      expect(delRes.status).toBe(409);
      expect(delRes.body.message).toMatch(/cannot delete.*staff/i);
    });
  });

  describe('2. Staff Management & Department Assignment', () => {
    let roadsDeptId;

    beforeEach(async () => {
      const deptRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Roadways Bureau',
          categoriesHandled: [ISSUE_CATEGORIES.ROADS]
        });
      roadsDeptId = deptRes.body.data.id;
    });

    it('allows Admin to view staff directory with department populated', async () => {
      const res = await request(app)
        .get('/api/v1/admin/staff')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2); // Dave and Sarah
      expect(res.body.data[0].role).toBe(ROLES.STAFF);
    });

    it('allows Admin to assign a staff member to an active department', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${staff1UserId}/department`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ departmentId: roadsDeptId });

      expect(res.status).toBe(200);
      expect(res.body.data.departmentId.id || res.body.data.departmentId._id).toBe(roadsDeptId);
      expect(res.body.data.departmentId.name).toBe('Roadways Bureau');
    });

    it('rejects assigning staff to a deactivated department (400 Bad Request)', async () => {
      // Deactivate department
      await Department.updateOne({ _id: roadsDeptId }, { isActive: false });

      const res = await request(app)
        .patch(`/api/v1/admin/staff/${staff1UserId}/department`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ departmentId: roadsDeptId });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/deactivated/i);
    });

    it('allows Admin to suspend and reactivate staff accounts', async () => {
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/staff/${staff1UserId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ accountStatus: 'suspended' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.accountStatus || suspendRes.body.data.status).toBe('suspended');

      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/staff/${staff1UserId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ accountStatus: 'active' });

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.accountStatus || reactivateRes.body.data.status).toBe('active');
    });

    it('prevents suspending the last active administrator', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${adminUserId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ accountStatus: 'suspended' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/last active administrator/i);
    });
  });

  describe('3. Issue Assignment & Reassignment Workflow', () => {
    let roadsDeptId;
    let createdIssueId;

    beforeEach(async () => {
      // Create department
      const deptRes = await request(app)
        .post('/api/v1/departments')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          name: 'Roadways Bureau',
          categoriesHandled: [ISSUE_CATEGORIES.ROADS]
        });
      roadsDeptId = deptRes.body.data.id;

      // Assign staff1 (Dave) and staff2 (Sarah) to roads department
      await User.updateOne({ _id: staff1UserId }, { departmentId: roadsDeptId });
      await User.updateOne({ _id: staff2UserId }, { departmentId: roadsDeptId });

      // Citizen creates issue
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Damaged Guardrail on Overpass',
          description: 'Metal guardrail bent into road lane following minor fender bender.',
          category: ISSUE_CATEGORIES.ROADS,
          location: {
            type: 'Point',
            coordinates: [77.58, 12.98],
            address: 'North Overpass Mile 4'
          },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      createdIssueId = issueRes.body.data.id;
    });

    it('allows Admin to assign eligible staff member to an eligible issue and records audit event', async () => {
      const res = await request(app)
        .post(`/api/v1/issues/${createdIssueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          departmentId: roadsDeptId,
          assigneeId: staff1UserId,
          reason: 'Assigned to Dave for initial roadway inspection'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.ASSIGNED);
      expect(res.body.data.departmentId.id || res.body.data.departmentId._id).toBe(roadsDeptId);
      expect(res.body.data.assigneeId.id || res.body.data.assigneeId._id).toBe(staff1UserId);

      // Verify audit event was logged
      const events = await IssueEvent.find({ issueId: createdIssueId });
      expect(events.length).toBeGreaterThanOrEqual(2); // created + assigned
      const assignEvent = events.find((e) => e.eventType === AUDIT_EVENT_TYPE.ASSIGNED);
      expect(assignEvent).toBeDefined();
      expect(assignEvent.newAssigneeId.toString()).toBe(staff1UserId);
      expect(assignEvent.newStatus).toBe(ISSUE_STATUS.ASSIGNED);
    });

    it('rejects assigning staff who belongs to a different department (400 Bad Request)', async () => {
      // Create separate water department
      const waterDept = await Department.create({
        name: 'Water Works',
        normalizedName: 'water works',
        categoriesHandled: [ISSUE_CATEGORIES.WATER]
      });

      // Try to assign Dave to Water Works (Dave is in Roadways)
      const res = await request(app)
        .post(`/api/v1/issues/${createdIssueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          departmentId: waterDept._id.toString(),
          assigneeId: staff1UserId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not belong to department/i);
    });

    it('rejects assigning an issue to a suspended staff member (400 Bad Request)', async () => {
      await User.updateOne({ _id: staff1UserId }, { status: 'suspended' });

      const res = await request(app)
        .post(`/api/v1/issues/${createdIssueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          departmentId: roadsDeptId,
          assigneeId: staff1UserId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/suspended or inactive/i);
    });

    it('allows Admin to reassign issue to another technician with required reason', async () => {
      // Initial assignment to staff1
      await request(app)
        .post(`/api/v1/issues/${createdIssueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          departmentId: roadsDeptId,
          assigneeId: staff1UserId
        });

      // Reassign to staff2 (Sarah) with required reason
      const reassignRes = await request(app)
        .post(`/api/v1/issues/${createdIssueId}/reassign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({
          departmentId: roadsDeptId,
          assigneeId: staff2UserId,
          reason: 'Technician Dave on scheduled leave; transferring ticket to Sarah.'
        });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.data.assigneeId.id || reassignRes.body.data.assigneeId._id).toBe(staff2UserId);

      // Verify audit log has reassigned event
      const reassignEvent = await IssueEvent.findOne({
        issueId: createdIssueId,
        eventType: AUDIT_EVENT_TYPE.REASSIGNED
      });
      expect(reassignEvent).toBeDefined();
      expect(reassignEvent.previousAssigneeId.toString()).toBe(staff1UserId);
      expect(reassignEvent.newAssigneeId.toString()).toBe(staff2UserId);
    });
  });

  describe('4. Issue Lifecycle State Machine & Resolution Verification', () => {
    let roadsDeptId;
    let issueId;

    beforeEach(async () => {
      const deptRes = await Department.create({
        name: 'Roadways Bureau',
        normalizedName: 'roadways bureau',
        categoriesHandled: [ISSUE_CATEGORIES.ROADS]
      });
      roadsDeptId = deptRes._id.toString();

      await User.updateOne({ _id: staff1UserId }, { departmentId: roadsDeptId });

      const issueDoc = await Issue.create({
        issueNumber: 'CF-1001',
        title: 'Dangerous Roadway Sinkhole',
        description: 'Sinkhole opening in front of municipal library.',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.6, 12.9], address: 'Library road' },
        reporterId: citizenUserId,
        departmentId: roadsDeptId,
        assigneeId: staff1UserId,
        status: ISSUE_STATUS.ASSIGNED,
        visibility: ISSUE_VISIBILITY.PUBLIC
      });
      issueId = issueDoc._id.toString();
    });

    it('allows assigned staff member to move ticket to in_progress', async () => {
      const res = await request(app)
        .post(`/api/v1/issues/${issueId}/transition`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({
          status: ISSUE_STATUS.IN_PROGRESS,
          reason: 'Crews dispatched with asphalt roller'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.IN_PROGRESS);
    });

    it('rejects another staff member from advancing work assigned to someone else (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/issues/${issueId}/transition`)
        .set('Cookie', staff2Cookie)
        .set('x-csrf-token', _staff2CsrfToken)
        .send({
          status: ISSUE_STATUS.IN_PROGRESS
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/can only progress issues assigned to them/i);
    });

    it('enforces complete resolution submission flow with notes and timestamps', async () => {
      // 1. Move to in_progress
      await request(app)
        .post(`/api/v1/issues/${issueId}/transition`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      // 2. Reject short resolution notes (< 10 chars)
      const badRes = await request(app)
        .post(`/api/v1/issues/${issueId}/resolve`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ resolutionNotes: 'Done' });
      expect(badRes.status).toBe(400);

      // 3. Submit valid resolution
      const resolveRes = await request(app)
        .post(`/api/v1/issues/${issueId}/resolve`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({
          resolutionNotes: 'Filled sinkhole with 2 tons aggregate and cold patch asphalt layer.',
          evidenceNotes: 'Inspected by District Foreman Morse'
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe(ISSUE_STATUS.RESOLVED);
      expect(resolveRes.body.data.resolutionNotes).toBe(
        'Filled sinkhole with 2 tons aggregate and cold patch asphalt layer.'
      );
      expect(resolveRes.body.data.resolvedAt).toBeDefined();
    });

    it('allows citizen reporter to verify and close a resolved report', async () => {
      // Set to resolved
      await Issue.updateOne(
        { _id: issueId },
        { status: ISSUE_STATUS.RESOLVED, resolutionNotes: 'Completed asphalt repair work' }
      );

      const closeRes = await request(app)
        .post(`/api/v1/issues/${issueId}/verify`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken);

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe(ISSUE_STATUS.CLOSED);
      expect(closeRes.body.data.closedAt).toBeDefined();
    });

    it('allows citizen reporter to reopen a resolved report with mandatory reason', async () => {
      // Set to resolved
      await Issue.updateOne(
        { _id: issueId },
        { status: ISSUE_STATUS.RESOLVED, resolutionNotes: 'Completed asphalt repair work' }
      );

      // Reopening without reason or short reason (< 10 chars) fails
      const badReopen = await request(app)
        .post(`/api/v1/issues/${issueId}/reopen`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({ reason: 'Bad' });
      expect(badReopen.status).toBe(400);

      // Reopening with valid reason succeeds
      const reopenRes = await request(app)
        .post(`/api/v1/issues/${issueId}/reopen`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          reason: 'The patch has collapsed again after rain; sinkhole remains dangerous.'
        });

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.status).toBe(ISSUE_STATUS.REOPENED);
      expect(reopenRes.body.data.reopenedReason).toMatch(/collapsed again/i);
    });

    it('rejects an unrelated citizen from verifying or reopening the issue (403 Forbidden)', async () => {
      await Issue.updateOne(
        { _id: issueId },
        { status: ISSUE_STATUS.RESOLVED, resolutionNotes: 'Completed asphalt repair work' }
      );

      const res = await request(app)
        .post(`/api/v1/issues/${issueId}/verify`)
        .set('Cookie', otherCitizenCookie)
        .set('x-csrf-token', otherCitizenCsrfToken);

      expect(res.status).toBe(403);
    });
  });

  describe('5. Audit Trail & Timeline Provenance', () => {
    it('generates immutable audit events throughout the full issue lifecycle and masks staff emails for public viewers', async () => {
      // 1. Citizen creates issue
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Damaged Sidewalk Curb',
          description: 'Curb crumbling near elementary school crosswalk.',
          category: ISSUE_CATEGORIES.ROADS,
          location: { type: 'Point', coordinates: [77.58, 12.98], address: 'School Zone' },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      const issueId = issueRes.body.data.id;

      // 2. Admin creates dept and assigns
      const dept = await Department.create({
        name: 'Civil Works',
        normalizedName: 'civil works',
        categoriesHandled: [ISSUE_CATEGORIES.ROADS]
      });
      await User.updateOne({ _id: staff1UserId }, { departmentId: dept._id });

      await request(app)
        .post(`/api/v1/issues/${issueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ departmentId: dept._id.toString(), assigneeId: staff1UserId });

      // 3. Staff moves to in_progress
      await request(app)
        .post(`/api/v1/issues/${issueId}/transition`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      // 4. Staff resolves
      await request(app)
        .post(`/api/v1/issues/${issueId}/resolve`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ resolutionNotes: 'Poured new concrete curb section and secured with barrier cones.' });

      // 5. Citizen verifies & closes
      await request(app)
        .post(`/api/v1/issues/${issueId}/verify`)
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken);

      // Query timeline as reporting citizen (authenticated)
      const citTimelineRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', citizenCookie);

      expect(citTimelineRes.status).toBe(200);
      expect(citTimelineRes.body.data.length).toBe(5);
      const types = citTimelineRes.body.data.map((e) => e.eventType);
      expect(types).toEqual([
        AUDIT_EVENT_TYPE.CREATED,
        AUDIT_EVENT_TYPE.ASSIGNED,
        AUDIT_EVENT_TYPE.STATUS_CHANGED,
        AUDIT_EVENT_TYPE.RESOLVED,
        AUDIT_EVENT_TYPE.CLOSED
      ]);

      // Query timeline as public visitor (unauthenticated) - staff personal details must be masked
      const pubTimelineRes = await request(app).get(`/api/v1/issues/${issueId}/timeline`);
      expect(pubTimelineRes.status).toBe(200);
      const publicStaffEvent = pubTimelineRes.body.data.find(
        (e) => e.eventType === AUDIT_EVENT_TYPE.RESOLVED
      );
      expect(publicStaffEvent.actorId.fullName).toBe('Municipal Staff');
      expect(publicStaffEvent.actorId.email).toBeUndefined();
    });

    it('proves public visitors and unrelated citizens cannot retrieve staff email addresses, personal names, or assignee IDs', async () => {
      // Setup issue, assign to staff1 with department, staff1 resolves
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Deep Pothole on Maple Ave',
          description: 'Large vehicle hazard near bus stop.',
          category: ISSUE_CATEGORIES.ROADS,
          location: { type: 'Point', coordinates: [77.59, 12.97], address: 'Maple Ave' },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      const issueId = issueRes.body.data.id;

      const dept = await Department.create({
        name: 'Highway Maintenance',
        normalizedName: 'highway maintenance',
        categoriesHandled: [ISSUE_CATEGORIES.ROADS]
      });
      await User.updateOne({ _id: staff1UserId }, { departmentId: dept._id });

      // Admin assigns
      await request(app)
        .post(`/api/v1/issues/${issueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ departmentId: dept._id.toString(), assigneeId: staff1UserId, reason: 'Assigned to road crew' });

      // Staff transitions to in_progress
      await request(app)
        .post(`/api/v1/issues/${issueId}/transition`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      // Staff resolves
      await request(app)
        .post(`/api/v1/issues/${issueId}/resolve`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ resolutionNotes: 'Filled pothole with cold asphalt patch.', evidenceNotes: 'Completed job inspection photo' });

      // 1. Test unauthenticated public visitor
      const pubRes = await request(app).get(`/api/v1/issues/${issueId}/timeline`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.success).toBe(true);
      expect(Array.isArray(pubRes.body.data)).toBe(true);
      expect(pubRes.body.data.length).toBeGreaterThanOrEqual(3);

      const pubRawJson = JSON.stringify(pubRes.body);
      // Absolute guarantee: no staff or admin email address is exposed in response string
      expect(pubRawJson).not.toContain('dave@civicfix.gov');
      expect(pubRawJson).not.toContain('admin@civicfix.gov');
      expect(pubRawJson).not.toContain('Technician Dave');

      pubRes.body.data.forEach((event) => {
        // actorId is anonymized
        expect(event.actorId).toBeDefined();
        expect(event.actorId.email).toBeUndefined();
        expect(event.actorId._id).toBeUndefined();
        expect(event.actorId.id).toBeUndefined();
        expect(['Municipal Staff', 'Citizen Reporter', 'Municipal System']).toContain(event.actorId.fullName);
        expect(['Municipal Staff', 'Citizen Reporter', 'Municipal System']).toContain(event.actorId.name);

        // Assignee IDs are stripped to prevent identity leakage
        expect(event.newAssigneeId).toBeNull();
        expect(event.previousAssigneeId).toBeNull();

        // details object is sanitized
        expect(event.details?.staffEmail).toBeUndefined();
        expect(event.details?.staffName).toBeUndefined();
        expect(event.details?.email).toBeUndefined();
      });

      // 2. Test unrelated authenticated citizen (also gets sanitized public view)
      const otherCitRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', otherCitizenCookie);

      expect(otherCitRes.status).toBe(200);
      const otherCitRawJson = JSON.stringify(otherCitRes.body);
      expect(otherCitRawJson).not.toContain('dave@civicfix.gov');
      expect(otherCitRawJson).not.toContain('Technician Dave');

      otherCitRes.body.data.forEach((event) => {
        expect(event.actorId.email).toBeUndefined();
        expect(event.newAssigneeId).toBeNull();
        expect(event.previousAssigneeId).toBeNull();
        expect(event.details?.staffEmail).toBeUndefined();
        expect(event.details?.staffName).toBeUndefined();
      });
    });

    it('separately verifies timeline access for public visitor, reporting citizen, staff technician, and administrator', async () => {
      // Create issue
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Streetlight Pole Damaged',
          description: 'Light knocked out after storm.',
          category: ISSUE_CATEGORIES.STREETLIGHT,
          location: { type: 'Point', coordinates: [77.6, 12.95], address: 'Oak Street' },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      const issueId = issueRes.body.data.id;

      const dept = await Department.create({
        name: 'Electrical Services',
        normalizedName: 'electrical services',
        categoriesHandled: [ISSUE_CATEGORIES.STREETLIGHT]
      });
      await User.updateOne({ _id: staff1UserId }, { departmentId: dept._id });

      // Admin assigns
      await request(app)
        .post(`/api/v1/issues/${issueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ departmentId: dept._id.toString(), assigneeId: staff1UserId, reason: 'Dispatched electrician' });

      // Staff transitions to in_progress
      await request(app)
        .post(`/api/v1/issues/${issueId}/transition`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      // Staff resolves
      await request(app)
        .post(`/api/v1/issues/${issueId}/resolve`)
        .set('Cookie', staff1Cookie)
        .set('x-csrf-token', staff1CsrfToken)
        .send({ resolutionNotes: 'Replaced ballast and lamp bulb.', evidenceNotes: 'Checked meter voltage' });

      // A) PUBLIC VISITOR: Sanitized, no employee PII
      const pubRes = await request(app).get(`/api/v1/issues/${issueId}/timeline`);
      expect(pubRes.status).toBe(200);
      const pubAssigned = pubRes.body.data.find((e) => e.eventType === AUDIT_EVENT_TYPE.ASSIGNED);
      expect(pubAssigned.details.departmentName).toBe('Electrical Services');
      expect(pubAssigned.details.staffEmail).toBeUndefined();
      expect(pubAssigned.details.staffName).toBeUndefined();
      expect(pubAssigned.newAssigneeId).toBeNull();

      // B) REPORTING CITIZEN: Retains progress and resolution notes, but masks staff personal email
      const repRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', citizenCookie);
      expect(repRes.status).toBe(200);
      const repAssigned = repRes.body.data.find((e) => e.eventType === AUDIT_EVENT_TYPE.ASSIGNED);
      expect(repAssigned.details.departmentName).toBe('Electrical Services');
      expect(repAssigned.details.staffEmail).toBeUndefined();
      if (repAssigned.newAssigneeId) {
        expect(repAssigned.newAssigneeId.email).toBeUndefined();
      }
      const repResolved = repRes.body.data.find((e) => e.eventType === AUDIT_EVENT_TYPE.RESOLVED);
      expect(repResolved.details.resolutionNotes).toBe('Replaced ballast and lamp bulb.');
      expect(repResolved.details.evidenceNotes).toBe('Checked meter voltage');
      expect(JSON.stringify(repRes.body)).not.toContain('dave@civicfix.gov');

      // C) STAFF TECHNICIAN: Authorized work provenance retains staff operational context
      const staffRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', staff1Cookie);
      expect(staffRes.status).toBe(200);
      const staffAssigned = staffRes.body.data.find((e) => e.eventType === AUDIT_EVENT_TYPE.ASSIGNED);
      expect(staffAssigned.details.departmentName).toBe('Electrical Services');
      expect(staffAssigned.details.staffEmail).toBe('dave@civicfix.gov');
      expect(staffAssigned.details.staffName).toBe('Technician Dave');
      expect(staffAssigned.newAssigneeId).toBeDefined();

      // D) ADMINISTRATOR: Retains full unredacted audit records for operational and supervisory audit
      const adminRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', adminCookie);
      expect(adminRes.status).toBe(200);
      const adminAssigned = adminRes.body.data.find((e) => e.eventType === AUDIT_EVENT_TYPE.ASSIGNED);
      expect(adminAssigned.details.staffEmail).toBe('dave@civicfix.gov');
      expect(adminAssigned.details.staffName).toBe('Technician Dave');
      expect(adminAssigned.actorId.email).toBe('admin@civicfix.gov');
      expect(adminAssigned.newAssigneeId.email).toBe('dave@civicfix.gov');
    });

    it('proves underlying audit events in MongoDB remain immutable and are never deleted or modified to hide information', async () => {
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Audit Storage Test',
          description: 'Testing immutable storage.',
          category: ISSUE_CATEGORIES.WATER,
          location: { type: 'Point', coordinates: [77.6, 12.95], address: 'Water Line 4' },
          visibility: ISSUE_VISIBILITY.PUBLIC
        });
      const issueId = issueRes.body.data.id;

      const dept = await Department.create({
        name: 'Water Works Dept',
        normalizedName: 'water works dept',
        categoriesHandled: [ISSUE_CATEGORIES.WATER]
      });
      await User.updateOne({ _id: staff1UserId }, { departmentId: dept._id });

      await request(app)
        .post(`/api/v1/issues/${issueId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', adminCsrfToken)
        .send({ departmentId: dept._id.toString(), assigneeId: staff1UserId });

      // Now query timeline as public visitor (API response is sanitized)
      const pubRes = await request(app).get(`/api/v1/issues/${issueId}/timeline`);
      expect(pubRes.status).toBe(200);
      const pubAssigned = pubRes.body.data.find((e) => e.eventType === AUDIT_EVENT_TYPE.ASSIGNED);
      expect(pubAssigned.details.staffEmail).toBeUndefined();

      // Directly verify MongoDB raw audit document in database was NOT altered or purged
      const rawDbEvent = await IssueEvent.findOne({
        issueId,
        eventType: AUDIT_EVENT_TYPE.ASSIGNED
      }).lean();

      expect(rawDbEvent).toBeDefined();
      expect(rawDbEvent.details.staffEmail).toBe('dave@civicfix.gov');
      expect(rawDbEvent.details.staffName).toBe('Technician Dave');
      expect(rawDbEvent.newAssigneeId.toString()).toBe(staff1UserId);
      expect(rawDbEvent.actorId.toString()).toBe(adminUserId);
    });

    it('enforces privacy boundary so non-reporters and public visitors cannot access private issue timelines (403)', async () => {
      const issueRes = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', citizenCookie)
        .set('x-csrf-token', citizenCsrfToken)
        .send({
          title: 'Private Drainage Complaint',
          description: 'Drainage problem on private property.',
          category: ISSUE_CATEGORIES.DRAINAGE,
          location: { type: 'Point', coordinates: [77.6, 12.95], address: 'Private Lane' },
          visibility: ISSUE_VISIBILITY.PRIVATE
        });
      const issueId = issueRes.body.data.id;

      // 1. Public visitor: 403 Forbidden
      const pubRes = await request(app).get(`/api/v1/issues/${issueId}/timeline`);
      expect(pubRes.status).toBe(403);

      // 2. Unrelated citizen: 403 Forbidden
      const otherRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', otherCitizenCookie);
      expect(otherRes.status).toBe(403);

      // 3. Reporter: 200 OK
      const repRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', citizenCookie);
      expect(repRes.status).toBe(200);

      // 4. Admin: 200 OK
      const adminRes = await request(app)
        .get(`/api/v1/issues/${issueId}/timeline`)
        .set('Cookie', adminCookie);
      expect(adminRes.status).toBe(200);
    });
  });

  describe('6. Queues & Workspaces', () => {
    it('returns assigned work orders for staff queue endpoint', async () => {
      const dept = await Department.create({
        name: 'Roadways Bureau',
        normalizedName: 'roadways bureau',
        categoriesHandled: [ISSUE_CATEGORIES.ROADS]
      });

      await Issue.create({
        issueNumber: 'CF-2001',
        title: 'Assigned Road Work',
        description: 'Roadwork for Technician Dave',
        category: ISSUE_CATEGORIES.ROADS,
        location: { type: 'Point', coordinates: [77.58, 12.98], address: 'Location 1' },
        reporterId: citizenUserId,
        departmentId: dept._id,
        assigneeId: staff1UserId,
        status: ISSUE_STATUS.ASSIGNED
      });

      const res = await request(app)
        .get('/api/v1/issues/staff/queue')
        .set('Cookie', staff1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.issues.length).toBe(1);
      expect(res.body.data.issues[0].title).toBe('Assigned Road Work');
    });

    it('returns unassigned triage tickets for admin triage queue', async () => {
      // Unassigned issue
      await Issue.create({
        issueNumber: 'CF-2002',
        title: 'Unassigned Waste Issue',
        description: 'Trash pile near park',
        category: ISSUE_CATEGORIES.WASTE,
        location: { type: 'Point', coordinates: [77.58, 12.98], address: 'Park' },
        reporterId: citizenUserId,
        departmentId: null,
        assigneeId: null,
        status: ISSUE_STATUS.SUBMITTED
      });

      const res = await request(app)
        .get('/api/v1/issues/admin/triage?unassignedOnly=true')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.issues.length).toBe(1);
      expect(res.body.data.issues[0].title).toBe('Unassigned Waste Issue');
    });
  });
});
