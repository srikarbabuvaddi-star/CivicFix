# CivicFix Complete API Specification — Milestones 01 to 06

**Version**: `v1`  
**Base URL**: `/api/v1`  
**Protocol**: HTTPS (Production) / HTTP (Local Development)  
**Authentication**: Encrypted Session Cookie (`civicfix.sid`, HttpOnly, SameSite)  
**CSRF Protection**: Synchronizer Token via `x-csrf-token` header on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`)

---

## 1. Response Envelope

All API endpoints return consistent JSON envelopes.

### Success Response Envelope (HTTP 200, 201)

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-02T14:30:00.000Z"
  }
}
```

### Error Response Envelope (HTTP 400, 401, 403, 404, 409, 429, 500)

```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "statusCode": 400,
  "details": [
    {
      "field": "category",
      "message": "Category must be one of: roads, waste, streetlight, water, drainage, other"
    }
  ],
  "meta": {
    "timestamp": "2026-11-02T14:30:00.000Z"
  }
}
```

---

## 2. Authentication & Session Endpoints

### 2.1 Retrieve CSRF Token
- **Method**: `GET`
- **Route**: `/api/v1/auth/csrf-token`
- **Authentication**: Optional

### 2.2 Register Citizen Account
- **Method**: `POST`
- **Route**: `/api/v1/auth/register`
- **Rate Limit**: 10 requests / 15 minutes per IP

### 2.3 User Sign In
- **Method**: `POST`
- **Route**: `/api/v1/auth/login`
- **Rate Limit**: 10 requests / 15 minutes per IP

### 2.4 User Sign Out
- **Method**: `POST`
- **Route**: `/api/v1/auth/logout`
- **Authentication**: Required (`civicfix.sid` cookie + `x-csrf-token` header)

### 2.5 Current Session Profile
- **Method**: `GET`
- **Route**: `/api/v1/auth/me`
- **Authentication**: Required

---

## 3. Civic Issues Module Endpoints

### 3.1 Create Civic Issue
- **Method**: `POST`
- **Route**: `/api/v1/issues`
- **Authentication**: Required (Citizen)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Description**: Creates an issue report. Identity is derived strictly from the authenticated session. The server atomically generates a human-readable issue number (e.g. `CF-1001`). Privileged fields (`status`, `priority`, `reporterId`, `issueNumber`) cannot be passed by the client.

#### Request Body
```json
{
  "title": "Severe Pothole on 4th Main Road",
  "description": "Large crater causing motorcycle hazards near the community park entrance.",
  "category": "roads",
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716],
    "address": "4th Main Road, Sector 3"
  },
  "visibility": "public"
}
```

#### Constraints
- `title`: String, 5–120 characters, trimmed.
- `description`: String, 10–2000 characters, trimmed.
- `category`: Enum: `'roads'`, `'waste'`, `'streetlight'`, `'water'`, `'drainage'`, `'other'`.
- `location.coordinates`: Array of `[longitude, latitude]` with `-180 <= lng <= 180` and `-90 <= lat <= 90`.
- `visibility`: Optional Enum: `'public'`, `'private'`. Default: `'public'`.

#### Response (HTTP 201 Created)
```json
{
  "success": true,
  "message": "Civic issue reported successfully",
  "data": {
    "id": "6726f1a8c901234567890123",
    "issueNumber": "CF-1001",
    "title": "Severe Pothole on 4th Main Road",
    "description": "Large crater causing motorcycle hazards near the community park entrance.",
    "category": "roads",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716],
      "address": "4th Main Road, Sector 3"
    },
    "reporterId": "6725e2193b2a8901b0f1901a",
    "status": "submitted",
    "priority": "normal",
    "visibility": "public",
    "departmentId": null,
    "assigneeId": null,
    "duplicateOf": null,
    "createdAt": "2026-11-02T14:30:00.000Z",
    "updatedAt": "2026-11-02T14:30:00.000Z"
  }
}
```

---

### 3.2 List Public Civic Issues
- **Method**: `GET`
- **Route**: `/api/v1/issues`
- **Authentication**: Public
- **Description**: Returns published, non-withdrawn issues using the privacy-safe Public DTO. Excludes reporter identity, personal notes, and internal assignments.

#### Query Parameters
- `page`: Integer (>= 1, default 1)
- `limit`: Integer (1–50, default 10)
- `category`: Optional Enum filter
- `status`: Optional Enum filter
- `search`: Bounded text search on title and issue number
- `sortBy`: `'createdAt'` or `'updatedAt'` (default `'createdAt'`)
- `sortOrder`: `'asc'` or `'desc'` (default `'desc'`)

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Public civic reports retrieved",
  "data": {
    "issues": [
      {
        "id": "6726f1a8c901234567890123",
        "issueNumber": "CF-1001",
        "title": "Severe Pothole on 4th Main Road",
        "description": "Large crater causing motorcycle hazards near the community park entrance.",
        "category": "roads",
        "location": {
          "type": "Point",
          "coordinates": [77.5946, 12.9716],
          "address": "4th Main Road, Sector 3"
        },
        "status": "submitted",
        "visibility": "public",
        "createdAt": "2026-11-02T14:30:00.000Z",
        "updatedAt": "2026-11-02T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.3 List Citizen's Own Reports
- **Method**: `GET`
- **Route**: `/api/v1/issues/mine`
- **Authentication**: Required (Citizen)
- **Description**: Returns all reports submitted by the authenticated citizen (including private and withdrawn reports). Never leaks reports belonging to other citizens.

#### Query Parameters
- `page`, `limit`, `category`, `status`, `sortBy`, `sortOrder`

---

### 3.4 Retrieve Issue by ID
- **Method**: `GET`
- **Route**: `/api/v1/issues/:id`
- **Authentication**: Optional (Guest, Reporting Citizen, Staff, or Admin)
- **Authorization Rules**:
  - **Reporting Citizen**: Receives full report with `canEdit` and `canWithdraw` flags.
  - **Staff / Admin**: Receives full report including `priority`, `departmentId`, `assigneeId`.
  - **Public Viewer**: If `visibility === 'public'`, receives Public DTO (no reporter credentials).
  - **Private Issue Unauthorized**: Returns `403 Forbidden`.

---

### 3.5 Update Submitted Issue
- **Method**: `PATCH`
- **Route**: `/api/v1/issues/:id`
- **Authentication**: Required (Reporting Citizen)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Description**: Allows citizens to edit only their own reports while `status === 'submitted'`. Once the report progresses (acknowledged, in progress, resolved, etc.), editing is rejected.
- **Permitted Fields**: `title`, `description`, `category`, `location`, `visibility`.
- **Forbidden Fields**: `status`, `priority`, `reporterId`, `issueNumber`, `departmentId`, `assigneeId`.

---

### 3.6 Controlled Report Withdrawal
- **Method**: `DELETE`
- **Route**: `/api/v1/issues/:id`
- **Authentication**: Required (Reporting Citizen)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Description**: Executes a controlled withdrawal of a report while `status === 'submitted'`. The record is preserved in the database with `status = 'withdrawn'` for auditability.

---

## 4. Department Management Endpoints

All department endpoints are scoped under `/api/v1/departments`.

### 4.1 List Departments
- **Method**: `GET`
- **Route**: `/api/v1/departments`
- **Authentication**: Authenticated
- **Query Parameters**:
  - `activeOnly`: `true` or `false`
  - `category`: Category filter
  - `search`: Name search
- **Response**: Array of Department objects with `id`, `name`, `normalizedName`, `description`, `categoriesHandled`, `serviceArea`, `isActive`.

### 4.2 Suggest Department by Category
- **Method**: `GET`
- **Route**: `/api/v1/departments/suggest/:category`
- **Authentication**: Authenticated
- **Response**: Active department handling the specified category or `null`.

### 4.3 Create Department (Admin Only)
- **Method**: `POST`
- **Route**: `/api/v1/departments`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**:
  ```json
  {
    "name": "Roads & Infrastructure",
    "description": "Maintains municipal roads and street signage",
    "categoriesHandled": ["roads", "streetlight"],
    "serviceArea": "Municipality-Wide"
  }
  ```
- **Constraints**: Enforces case-insensitive normalized uniqueness on department names (HTTP 409 Conflict if duplicate).

### 4.4 Update Department (Admin Only)
- **Method**: `PATCH`
- **Route**: `/api/v1/departments/:id`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**: Optional `name`, `description`, `categoriesHandled`, `serviceArea`, `isActive`.

### 4.5 Delete Department (Admin Only - Safe Guarded)
- **Method**: `DELETE`
- **Route**: `/api/v1/departments/:id`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Safety Rule**: If existing civic issues or active staff members reference this department, deletion is blocked with HTTP 409 Conflict and recommendation to deactivate (`isActive: false`).

---

## 5. Administrative Staff Operations

All staff operations are scoped under `/api/v1/admin`.

### 5.1 Staff Directory
- **Method**: `GET`
- **Route**: `/api/v1/admin/staff`
- **Authentication**: Required (`admin` role)
- **Query Parameters**: `departmentId`, `status`, `search`
- **Response**: Array of staff user accounts with populated department details.

### 5.2 Assign Staff Department
- **Method**: `PATCH`
- **Route**: `/api/v1/admin/staff/:id/department`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**: `{ "departmentId": "<department-id>" }` (or `null` for unassign)
- **Constraints**: Rejects assigning staff to deactivated departments.

### 5.3 Update Staff Account Status
- **Method**: `PATCH`
- **Route**: `/api/v1/admin/staff/:id/status`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**: `{ "status": "active" | "suspended" }`
- **Safety Rule**: Rejects suspension if the target is the last active administrator in the system (HTTP 400).

---

## 6. Issue Lifecycle, Assignment & Audit Trail

All issue workflow endpoints are scoped under `/api/v1/issues`.

### 6.1 Assign Issue (Admin Only)
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/assign`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**:
  ```json
  {
    "departmentId": "6726f1a8c901234567890123",
    "assigneeId": "6726f1a8c901234567890456",
    "reason": "Assigned for on-site roadway inspection"
  }
  ```
- **Behavior**: Transitions issue from `submitted`/`under_review` to `assigned`. Records `assigned` event in immutable audit log. Rejects inactive departments or suspended staff.

### 6.2 Reassign Issue (Admin Only)
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/reassign`
- **Authentication**: Required (`admin` role)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**: Requires `departmentId`, `assigneeId`, and mandatory `reason` (min 5 chars). Records `reassigned` event in audit log.

### 6.3 State Transition
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/transition`
- **Authentication**: Authenticated (Role-restricted per state machine)
- **Body**: `{ "status": "in_progress", "reason": "Work commenced" }`

### 6.4 Resolve Issue (Staff / Admin)
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/resolve`
- **Authentication**: Required (Assigned Staff or Admin)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**:
  ```json
  {
    "resolutionNotes": "Completed asphalt patching with 2 tons aggregate (min 10 chars)",
    "evidenceNotes": "Work Order #4421 signed off by foreman"
  }
  ```
- **Behavior**: Sets `status = 'resolved'`, records `resolvedAt` timestamp and immutable `resolved` audit event.

### 6.5 Verify and Close Issue (Citizen Reporter / Admin)
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/verify`
- **Authentication**: Required (Reporting Citizen or Admin)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Behavior**: Sets `status = 'closed'`, records `closedAt` timestamp and immutable `closed` audit event.

### 6.6 Reopen Issue (Citizen Reporter / Admin)
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/reopen`
- **Authentication**: Required (Reporting Citizen or Admin)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**: `{ "reason": "Patch collapsed again after heavy rain (min 10 chars)" }`
- **Behavior**: Sets `status = 'reopened'`, records reason and immutable `reopened` audit event.

### 6.7 Issue Audit Timeline
- **Method**: `GET`
- **Route**: `/api/v1/issues/:id/timeline`
- **Authentication**: Optional
- **Behavior**: Returns append-only chronological event history. Masks sensitive staff/admin personal email addresses for unauthenticated public viewers.

### 6.8 Staff Work Orders Queue
- **Method**: `GET`
- **Route**: `/api/v1/issues/staff/queue`
- **Authentication**: Required (`staff`, `admin`)
- **Description**: Returns live issues assigned to the authenticated staff technician with pagination and status filters.

### 6.9 Admin Triage Queue
- **Method**: `GET`
- **Route**: `/api/v1/issues/admin/triage`
- **Authentication**: Required (`admin`)
- **Description**: Returns unassigned reports or reports awaiting dispatch.

---

## 7. Platform Health Endpoint
- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Response**: `{ status: 'ok', uptimeSeconds, environment, database: 'connected' }`

---

## 8. In-App Notifications & User Preferences

Database-backed notifications delivered automatically on key lifecycle events (submission, assignment, status change, resolution, verification, reopening, and feedback) with an idempotency dedup window.

### 8.1 List Notifications
- **Method**: `GET`
- **Route**: `/api/v1/notifications`
- **Authentication**: Required (Scoped strictly to `recipientId: req.session.userId`)
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10, max: 50)
  - `isRead` (optional boolean)
- **Response**: Paginated list of notifications with unread counts.

### 8.2 Get Unread Count
- **Method**: `GET`
- **Route**: `/api/v1/notifications/unread-count`
- **Authentication**: Required
- **Response**: `{ success: true, data: { unreadCount: 3 } }`

### 8.3 Mark Notification as Read
- **Method**: `PATCH`
- **Route**: `/api/v1/notifications/:id/read`
- **Authentication**: Required (Rejects attempts by other users with HTTP 404/403)
- **Response**: Updated notification object with populated `readAt` ISO timestamp.

### 8.4 Mark All Notifications as Read
- **Method**: `PATCH`
- **Route**: `/api/v1/notifications/read-all`
- **Authentication**: Required
- **Response**: `{ success: true, data: { modifiedCount: 4 } }`

### 8.5 Get Notification Preferences
- **Method**: `GET`
- **Route**: `/api/v1/users/preferences`
- **Authentication**: Required
- **Response**: `{ email: true, inApp: true }`

### 8.6 Update Notification Preferences
- **Method**: `PATCH`
- **Route**: `/api/v1/users/preferences`
- **Authentication**: Required
- **CSRF Protection**: Required (`x-csrf-token`)
- **Body**: `{ "email": false, "inApp": true }`

---

## 9. Citizen Feedback & Resolution Evaluation

Allows citizen reporters to evaluate completed field repairs on resolved or closed issues.

### 9.1 Submit Citizen Feedback
- **Method**: `POST`
- **Route**: `/api/v1/issues/:id/feedback`
- **Authentication**: Required (`citizen` reporter or `admin`)
- **CSRF Protection**: Required (`x-csrf-token`)
- **Validation**:
  - `rating`: Integer between 1 and 5 (inclusive)
  - `resolutionQuality`: Enum (`poor`, `acceptable`, `good`, `excellent`)
  - `comment`: Optional string (up to 1000 characters)
- **Rules**:
  - Issue must be in `resolved` or `closed` status.
  - Rejects submissions by unrelated citizens (HTTP 403 Forbidden).
  - Enforces one feedback record per issue (`issueId` unique index; duplicate requests return HTTP 409 Conflict).
  - Dispatches `FEEDBACK_RECEIVED` notification to assigned staff technician and administrator.

### 9.2 Get Issue Feedback
- **Method**: `GET`
- **Route**: `/api/v1/issues/:id/feedback`
- **Authentication**: Required
- **Authorization**: Accessible only to reporting citizen, assigned staff, or platform administrators. Rejects third-party citizens with HTTP 403 Forbidden to protect reporter privacy.

---

## 10. Operational Analytics & Geographic Hotspots

Real database-backed MongoDB aggregation pipelines. Zero fabricated metrics or hardcoded counters.

### 10.1 Citizen Telemetry
- **Method**: `GET`
- **Route**: `/api/v1/analytics/citizen`
- **Authentication**: Required (`citizen` role)
- **Response**:
  - `totalReports`: Lifetime complaints submitted by caller
  - `resolvedReports`: Count in `resolved` or `closed` status
  - `statusBreakdown`: Object mapping statuses to exact counts
  - `averageSatisfactionRating`: Average feedback score (1–5) or `null`

### 10.2 Staff Technician Workload
- **Method**: `GET`
- **Route**: `/api/v1/analytics/staff`
- **Authentication**: Required (`staff`, `admin`)
- **Response**:
  - `totalAssignedWorkOrders`: Work orders dispatched to technician
  - `activeWorkOrders`: Tickets in `assigned` or `in_progress` status
  - `completedResolutions`: Tickets resolved by technician
  - `averageResolutionHours`: Real computed elapsed duration between ticket assignment and resolution submission
  - `qualityBreakdown`: Breakdown of citizen quality ratings received

### 10.3 Administrative Telemetry
- **Method**: `GET`
- **Route**: `/api/v1/analytics/admin`
- **Authentication**: Required (`admin`)
- **Response**:
  - `totalIssues`: Total complaints in database
  - `resolutionRatePercent`: Real percentage of tickets resolved/closed
  - `averageCitizenRating`: Global average citizen satisfaction score
  - `categoryBreakdown`: Issue counts mapped to each category
  - `statusBreakdown`: Full lifecycle state counts
  - `departmentWorkload`: Array of active departments with `totalAssigned`, `resolvedCount`, and `activeCount`

### 10.4 Geographic Hotspots & Location Privacy Policy
- **Method**: `GET`
- **Route**: `/api/v1/analytics/hotspots`
- **Authentication**: Optional
- **Query Parameters**:
  - `category`: Filter by category (e.g. `roads`, `waste`)
  - `timePeriod`: Filter by timeframe (`7d`, `30d`, `90d`, `all`)
  - `minThreshold`: Minimum report count required for cluster inclusion (default: `2`)
- **Location Privacy Policy**:
  - Coordinates are clustered into neighborhood grid cells (~1.1km precision, 2 decimal places).
  - Clusters with fewer than `minThreshold` (default 2) reports are completely omitted from the output to prevent triangulation and deanonymization of isolated citizen residences.


