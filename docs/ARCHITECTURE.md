# CivicFix System Architecture & Technical Design

## 1. Architectural Style: Modular Monolith

CivicFix is architected as a **modular monolith** with clean client/server separation within a unified repository workspace.

```
CivicFix/
├── client/          # Single-Page Application (React 19 + Vite)
├── server/          # RESTful Backend API (Node.js + Express + Mongoose)
├── docs/            # Architecture, API & Setup Documentation
├── package.json     # Root NPM Workspaces Orchestrator
└── README.md        # Project Overview & Quickstart
```

---

## 2. Issue Module Architecture & Data Modeling

### 2.1 Issue Schema (`server/src/modules/issues/issue.model.js`)

| Field | Type | Constraints | Description |
|---|---|---|---|
| `issueNumber` | String | Unique, Indexed | Human-readable identifier (e.g. `CF-1001`) generated atomically |
| `title` | String | 5–120 chars, trimmed | Concise issue title |
| `description` | String | 10–2000 chars, trimmed | Detailed incident notes |
| `category` | String (Enum) | `roads`, `waste`, `streetlight`, `water`, `drainage`, `other` | Civic category classification |
| `location` | GeoJSON Point | `coordinates: [lng, lat]`, optional `address` | Geospatial point with 2dsphere index |
| `reporterId` | ObjectId | Ref: `User`, Required, Indexed | Derived exclusively from authenticated session |
| `departmentId` | ObjectId | Ref: `Department`, Default `null` | Municipal department assigned to ticket |
| `assigneeId` | ObjectId | Ref: `User`, Default `null` | Field technician assigned to ticket |
| `status` | String (Enum) | `submitted`, `acknowledged`, `in_progress`, `resolved`, `closed`, `withdrawn` | Current lifecycle state (defaults to `submitted`) |
| `priority` | String (Enum) | `low`, `normal`, `high`, `urgent` | Operational priority (defaults to `normal`) |
| `visibility` | String (Enum) | `public`, `private` | Controls explore visibility (defaults to `public`) |
| `duplicateOf` | ObjectId | Ref: `Issue`, Default `null` | Reference to parent ticket if duplicate |
| `createdAt` / `updatedAt` | Date | Auto timestamps | Standard auditing timestamps |

### 2.2 Database Indexes
- `{ issueNumber: 1 }` (Unique constraint)
- `{ reporterId: 1, updatedAt: -1 }` (Optimizes `/issues/mine` citizen queries)
- `{ status: 1, category: 1, createdAt: -1 }` (Optimizes departmental triage)
- `{ visibility: 1, status: 1, createdAt: -1 }` (Optimizes `/issues` public explore queries)
- `{ location: '2dsphere' }` (Enables geospatial proximity and boundary queries)

---

## 3. Concurrency-Safe Issue Number Generation

Public issue numbers follow a readable format (`CF-1001`, `CF-1002`, ...).
- **Mechanism**: Dedicated `counters` collection operated via MongoDB's atomic `findOneAndUpdate({ _id: 'issueNumber' }, { $inc: { seq: 1 } }, { new: true, upsert: true })`.
- **Concurrency Safety**: Atomic `$inc` prevents sequence collisions under concurrent submissions.
- **Fail-Safe Policy**: If a subsequent document insert fails, gaps in numbering are accepted, preserving uniqueness and concurrency without locking overhead.
- **Privacy**: Internal MongoDB `_id` values are never used as public reference codes.

---

## 4. Privacy & Authorization Matrix

| User Role / Context | View Public Issue | View Private Issue | Create Issue | Edit Report | Withdraw Report | View Priority / Assignee |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Anonymous Guest** | Yes (Public DTO) | No (403) | No (401) | No | No | No |
| **Citizen (Reporter)** | Yes (Full View) | Yes (Full View) | Yes | Yes (if `submitted`) | Yes (if `submitted`) | No |
| **Citizen (Other)** | Yes (Public DTO) | No (403) | Yes | No (403) | No (403) | No |
| **Staff Technician** | Yes (Internal View) | Yes (Internal View) | Yes | No | No | Yes |
| **Civic Administrator**| Yes (Internal View) | Yes (Internal View) | Yes | Yes (Admin bypass) | Yes (Admin bypass) | Yes |

### Public DTO Sanitization
When a public issue is requested by unauthenticated visitors or non-reporting citizens, the backend projects a sanitized DTO:
- `reporterId` and `reporterEmail` are stripped.
- Internal technician assignments (`assigneeId`) and department routing details are omitted.
- Operational priority (`priority`) is omitted to prevent public gaming of urgency ratings.

---

## 5. Controlled Report Withdrawal Policy

CivicFix avoids arbitrary physical record deletion. When a citizen requests deletion (`DELETE /api/v1/issues/:id`):
1. The server checks that the requester is the reporting citizen.
2. The server verifies that the report is still in `submitted` status (unclaimed by municipal staff).
3. The server updates `status = 'withdrawn'`.
4. The database preserves the complete historical record for municipal auditability, while excluding the report from public explore feeds.

---

## 6. Frontend Location Architecture

- **Map Provider**: Leaflet with OpenStreetMap tiles (open-source, zero proprietary credential requirement).
- **Explicit Geolocation Consent**: The platform never calls browser geolocation APIs on page load. A dedicated button prompts the user with an explicit privacy notice explaining that GPS coordinates are recorded solely to locate the civic incident.
- **Accessible Coordinate Fallback**: Explicit numeric input fields for Latitude and Longitude with boundary validation (-90 to 90, -180 to 180) ensure full accessibility and usability even without JavaScript map tile access.

---

## 7. Department and Staff Operational Model

CivicFix models real municipal organizational structures:
- **Department**: Distinct operational units (e.g. Roads & Infrastructure, Water Works, Sanitation) with unique normalized names, handled categories, and service areas.
- **Safe Deactivation**: Inactive departments cannot receive new issue assignments or staff members. Destructive deletion is blocked with HTTP 409 Conflict if issues or staff members reference the department.
- **Staff Assignment**: Staff technicians belong to an active department and can only be assigned civic issues routed to their department.
- **Administrative Safeguard**: The system actively prevents deactivating or suspending the last active administrator account to eliminate lockout risks.

---

## 8. Issue Lifecycle State Machine

The issue workflow follows a centralized finite state machine with strict transition constraints:

```
[submitted]
   │
   ├───────────► [under_review] (Staff/Admin)
   │                  │
   ├───────────► [assigned] (Admin)
   │                  │
   │                  ▼
   │             [in_progress] (Assigned Staff / Admin)
   │                  │
   │                  ▼
   │             [resolved] (Assigned Staff / Admin - requires resolution notes)
   │               ▲      │
   │               │      ├───────────► [closed] (Citizen Reporter / Admin)
   │               │      │
   │               └──────┴───────────► [reopened] (Citizen Reporter / Admin - requires reason)
   │
   ├───────────► [rejected] (Staff/Admin - requires reason)
   │
   └───────────► [withdrawn] (Reporting Citizen only)
```

---

## 9. Immutable Audit Trail Ledger

Every lifecycle event, assignment, status change, and resolution is permanently written to an append-only MongoDB collection (`IssueEvent`).
- **No In-Place Mutation**: `IssueEvent` does not have an `updatedAt` timestamp and cannot be edited or deleted.
- **Provenance**: Records `actorId`, `actorRole`, `previousStatus`, `newStatus`, `previousDepartmentId`, `newDepartmentId`, `previousAssigneeId`, `newAssigneeId`, `reason`, and `details` (work resolution notes, evidence notes).
- **Public Masking**: When viewed by unauthenticated public visitors, staff and administrator email addresses and personal identities are masked as "Municipal Staff" or "Civic Administrator".

---

## 10. Notification & Transactional Email Architecture

CivicFix features a durable event dispatcher (`notificationDispatcher.js`) that triggers on all issue lifecycle mutations and feedback submissions.

```
[Issue / Feedback Mutation]
           │
           ▼
[dispatchIssueEvent()]
   ├── 1. Recipient Resolution (Reporter, Staff Assignee, Admins)
   ├── 2. User Notification Preference Check (inApp, email)
   ├── 3. In-App Notification (Notification model with 10s idempotency dedup)
   └── 4. Transactional Email (Nodemailer SMTP with HTML escaping & graceful fallback)
```

- **Idempotency Window**: Prevents duplicate notification spam during retry loops by querying whether an identical notification (`recipientId`, `relatedIssueId`, `type`) was delivered within the preceding 10 seconds.
- **Privacy & Previews**: Notifications omit sensitive personal data and render sanitized titles and summaries.
- **Email Resilience**: If SMTP credentials are not configured or the mail transport encounters a network drop, the failure is caught and logged as a warning; the primary HTTP transaction is never blocked or rolled back.

---

## 11. Citizen Feedback & Quality Evaluation

Once an issue progresses to `resolved` or `closed`, the citizen reporter can evaluate the workmanship:
- **Feedback Model**: Stored in a dedicated collection (`Feedback`) with a compound unique index `{ issueId: 1 }` to enforce strictly one feedback submission per issue.
- **Attributes**: `rating` (1–5 integer), `resolutionQuality` (`poor`, `acceptable`, `good`, `excellent`), optional `comment` (up to 1000 characters).
- **Ownership Gate**: Only the original citizen reporter can submit feedback. Third-party public queries are rejected with HTTP 403 Forbidden.

---

## 12. Operational Analytics & Geospatial Privacy

All metrics displayed on Citizen, Staff, and Admin consoles are computed via native **MongoDB Aggregation Pipelines**.

### 12.1 Real-Time Pipelines
- **Citizen Pipeline**: Matches on `reporterId`, computes counts by status, and calculates average satisfaction rating from `Feedback`.
- **Staff Pipeline**: Matches on `assigneeId`, aggregates active work orders, completed resolutions, and calculates average resolution duration (elapsed hours from `assigned` to `resolvedAt`).
- **Admin Pipeline**: Global aggregation computing resolution rate percentage, departmental workloads, category distributions, and platform-wide satisfaction score.

### 12.2 Geographic Hotspots & Location Privacy
Hotspots aggregate spatial reports using coordinate rounding to grid cells (~1.1km cell width at 2 decimal places):
```javascript
{
  $group: {
    _id: {
      lngGrid: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] },
      latGrid: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] }
    },
    count: { $sum: 1 },
    categories: { $push: '$category' }
  }
}
```
- **Privacy Threshold**: Grid cells with fewer than `minThreshold` (default `2`) reports are filtered out (`{ $match: { count: { $gte: minThreshold } } }`). Isolated individual citizen locations are never exposed.


