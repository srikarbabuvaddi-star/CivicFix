# CivicFix — Civic Issue Reporting & Resolution Platform

**Individual B.Tech CSE Major Project**  
*Development Environment: Google Antigravity | Full-Stack Production Architecture*

---

## 1. Project Overview

**CivicFix** is a production-minded, transparent civic technology web platform designed to bridge communication and workflow between municipal residents, field maintenance technicians, and civic administrators. 

Unlike traditional black-box grievance portals where citizen complaints vanish into bureaucratic obscurity, CivicFix establishes end-to-end operational visibility. Citizens report localized infrastructure failures (potholes, water pipe breaches, street light outages) with interactive geospatial coordinates, track real-time issue lifecycle progression, receive persistent in-app and email notifications, evaluate completed repairs through qualitative 5-star feedback, and verify or reopen unresolved tickets.

Behind the scenes, city administrators triage incoming reports, manage specialized municipal departments, assign work orders to vetted field staff, and monitor live citywide operational analytics and geographic clustering hotspots powered by MongoDB aggregation pipelines.

---

## 2. Problem Statement

Urban local bodies face severe operational bottlenecks in infrastructure defect management:
1. **Opaque Resolution Lifecycle**: Citizens have no insight into who is handling their complaint, whether parts are ordered, or when a repair crew visited the location.
2. **Triangulation & Resident Privacy Risks**: Public reporting portals often leak the residential location and contact information of reporting citizens.
3. **Department Silos & Unverified Closures**: Maintenance issues are frequently marked "closed" by contractors without on-site verification, leaving citizens frustrated with no formal recourse.
4. **Lack of Operational Analytics**: City managers lack automated geographic cluster telemetry to pinpoint recurring failure zones (e.g., repeatedly burst water mains along specific corridors).

---

## 3. Project Objectives

- **Genuine Full-Stack Engineering**: Build a modular monolith with React 19, Node.js + Express, and MongoDB without fake mocks, simulated metrics, or localStorage authentication.
- **Strict Role-Based Access Control**: Provide distinct, role-enforced interfaces for `citizen`, `staff`, and `admin` users.
- **Auditable Lifecycle Finite State Machine**: Implement a formal 9-state lifecycle machine with append-only provenance ledgers (`IssueEvent`).
- **Geospatial Intelligence with Privacy Protections**: Support Leaflet map interactions with OpenStreetMap and automatic ~100m grid coordinate rounding on public DTOs.
- **Citizen Empowerment**: Enable verified resolution closures, qualitative satisfaction rating, and mandatory-reason reopening workflows.
- **Production-Quality Architecture**: Defendable in academic evaluation (Viva Voce) with 88 automated tests, multi-stage Docker deployment, and strict security hardening.

---

## 4. Actual Implemented Features

### Citizen Capabilities
- **Secure Registration & Authentication**: Self-registration defaulting to `citizen` role, Argon2id password hashing, and HttpOnly session cookies.
- **Geospatial Issue Filing**: Interactive Leaflet pin drop, automatic reverse geocoding fallback, category selection, and human-readable sequential issue numbering (`CF-1001`).
- **Personal Complaint Tracking**: Real-time status badges, filtering, and pagination on `/my-reports`.
- **Controlled Edit & Withdrawal**: Citizens can update descriptions or withdraw unassigned reports.
- **In-App Notification Bell**: Live unread count badge, mark-as-read, mark-all-read, and automatic navigation to related issues.
- **Resolution Verification & Reopening**: View technician repair notes and evidence; confirm & close tickets or reopen unsatisfactory repairs with mandatory reasons.
- **Qualitative Feedback**: Submit 1–5 star satisfaction ratings and workmanship assessments (`poor`, `acceptable`, `good`, `excellent`).

### Staff Technician Capabilities
- **Assigned Work Order Queue**: Dedicated workspace displaying issues assigned to the logged-in technician's department.
- **Status Progression**: Transition tickets from `assigned` to `in_progress` upon site arrival.
- **Resolution Completion**: Submit detailed work completion notes and work order evidence identifiers to advance tickets to `resolved`.
- **Staff Performance Telemetry**: Personal metrics tracking active work orders, completed repairs, and citizen satisfaction ratings.

### Administrator Operations Console
- **Issue Triage**: Unassigned report queue with filtering and direct department/staff assignment modal.
- **Department Management**: Create, edit, and safely deactivate municipal departments with normalized name uniqueness and deletion locks if tickets or staff reference the department.
- **Staff Management Directory**: View municipal staff, assign personnel to departments, and toggle active/suspended status with safeguards preventing suspension of the last administrator.
- **Municipal Analytics & Hotspot Intelligence**: Real MongoDB aggregation metrics tracking citywide resolution rate %, category breakdowns, department workloads, and coarse (~1.1km) geographic hotspot clusters.
- **System Telemetry**: Real-time liveness (`/health`) and readiness (`/ready`) health checks, uptime counters, and database connection monitors.

### Public Exploration
- **Public Grievance Explorer**: Publicly visible issues on `/explore` with keyword search, category filters, and timeframe filters (`7d`, `30d`, `90d`, `all`).
- **Dual Map/List View**: Interactive Leaflet cluster map and responsive issue cards.
- **Privacy Protections**: Public coordinates rounded to ~100m; citizen reporter personal contact details stripped.

---

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, Vite 6, JavaScript (ES Modules) |
| **Client Routing & UI** | React Router 7, Lucide React, Leaflet & React-Leaflet |
| **Backend Runtime** | Node.js (v20+), Express.js 4.21 (ES Modules) |
| **Database & ODM** | MongoDB (v7.0), Mongoose 8.10 |
| **Session & Auth** | `express-session`, `connect-mongo`, Argon2id (`argon2`), `crypto` |
| **Security & Headers** | `helmet`, `cors`, custom Double-Submit CSRF, custom NoSQL sanitizer |
| **Validation** | `zod` schema validation for all request payloads, queries, and params |
| **Testing** | Vitest 3, Supertest 7 (88 automated integration tests) |
| **DevOps & Containers** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## 6. Software Architecture Description

CivicFix is architected as a **Modular Monolith** with clear separation of concerns between client and server:

```
CivicFix/
├── .github/workflows/ci.yml    # Continuous integration automated testing pipeline
├── client/                     # Single Page Application (React 19 + Vite)
│   ├── src/
│   │   ├── app/                # Root providers, code-split Suspense routing
│   │   ├── components/         # Reusable UI primitives, Modals, MapPickers, NotificationBell
│   │   ├── features/auth/      # AuthContext, ProtectedRoute, RoleGuard
│   │   ├── layouts/            # RootLayout (Navbar/Footer) & DashboardLayout shells
│   │   ├── pages/              # LandingPage, Explore, Dashboards, IssueDetails, CreateIssue
│   │   ├── services/           # apiClient (CSRF-aware), auth, issues, departments, analytics
│   │   └── styles/             # Deep Navy (#0f2b48) and Teal (#0d9488) design system
├── server/                     # REST API Backend (Node.js + Express)
│   ├── Dockerfile              # Production multi-stage container
│   ├── src/
│   │   ├── config/             # DB, Session store, Zod env validation, Constants
│   │   ├── middleware/         # Auth, Role, CSRF, Rate limit, CorrelationId, Sanitize, Error
│   │   ├── modules/admin/      # Staff directory, Department assignment, Status management
│   │   ├── modules/analytics/  # MongoDB aggregation pipelines (hotspots, citizen, staff, admin)
│   │   ├── modules/auth/       # Session auth, CSRF endpoint, Registration, Login, Logout
│   │   ├── modules/departments/# Department CRUD, safe deactivation, uniqueness
│   │   ├── modules/feedback/   # Feedback ratings, quality evaluations, BOLA checks
│   │   ├── modules/issues/     # Issue model, Counter, Audit events, Finite state machine
│   │   ├── modules/notifications/ # In-app notification dispatcher, unread tracking
│   │   ├── modules/users/      # User model, profiles, notification preferences
│   │   ├── services/           # emailService with graceful logging fallback
│   │   ├── tests/              # 88 Vitest integration & E2E tests
│   │   └── utils/              # Argon2id hashing, API response envelope, Redacting logger
├── docs/                       # Complete Academic & Engineering Dossier
└── docker-compose.yml          # Containerized local production composition
```

---

## 7. User Roles & Permission Matrices

CivicFix enforces 3 hierarchical municipal roles:

| Capability | Citizen (`citizen`) | Staff Technician (`staff`) | Administrator (`admin`) | Unauthenticated Public |
|---|:---:|:---:|:---:|:---:|
| Browse Public Reports & Map | ✅ | ✅ | ✅ | ✅ |
| Submit New Issue | ✅ | ❌ | ❌ | ❌ |
| Edit Pending Issue | ✅ (Own Only) | ❌ | ❌ | ❌ |
| Withdraw Issue | ✅ (Own Only) | ❌ | ❌ | ❌ |
| Access Staff Work Queue | ❌ | ✅ | ✅ | ❌ |
| Transition Issue (`in_progress`) | ❌ | ✅ (Assigned Only) | ✅ | ❌ |
| Submit Resolution Notes | ❌ | ✅ (Assigned Only) | ✅ | ❌ |
| Verify & Close Issue | ✅ (Reporter Only) | ❌ | ✅ | ❌ |
| Reopen Issue with Reason | ✅ (Reporter Only) | ❌ | ✅ | ❌ |
| Submit Resolution Feedback | ✅ (Reporter Only) | ❌ | ❌ | ❌ |
| View Unmasked Audit Timeline | ✅ (Own Only) | ✅ | ✅ | ❌ (Masked Only) |
| Manage Departments | ❌ | ❌ | ✅ | ❌ |
| Assign / Reassign Staff | ❌ | ❌ | ✅ | ❌ |
| Manage Staff Accounts | ❌ | ❌ | ✅ | ❌ |
| View Admin Analytics & Hotspots | ❌ | ❌ | ✅ | ❌ |

---

## 8. Module Descriptions

1. **`auth`**: Handles citizen registration, credential verification via Argon2id, session cookie issuance (`civicfix.sid`), CSRF token distribution, and logout session destruction.
2. **`users`**: Manages user profiles, role enforcement, account status (`active` / `suspended`), and notification preferences.
3. **`issues`**: Core domain module managing complaint submission, atomic sequential numbering (`CF-1001`), geospatial Point indexing, queries with privacy masking, citizen editing, and controlled withdrawals.
4. **`departments`**: Administrative department management with normalized unique names, handled categories, and 409 Conflict locks preventing deletion of departments linked to active issues or staff.
5. **`admin`**: Staff directory administration, department reassignment, and account status controls with safeguards preserving the last active administrator.
6. **`issueLifecycle`**: Strict finite state machine governing permitted status transitions and validating actor authorization.
7. **`issueAudit`**: Append-only `IssueEvent` collection recording who changed what, when, previous/new states, and reasons.
8. **`notifications`**: Persistent in-app notifications with unread counts, mark-as-read, idempotency safeguards, and transactional email notification dispatch.
9. **`feedback`**: Structured citizen satisfaction rating (1–5 stars) and qualitative workmanship assessment linked to resolved issues.
10. **`analytics`**: Real-time aggregation pipelines computing citizen statistics, technician workloads, platform resolution rates, and coarse geographic clustering hotspots.

---

## 9. Database Collections & Schema Design

| Collection | Model File | Purpose & Indexes |
|---|---|---|
| `users` | `user.model.js` | User identity & credentials. Indexes: `{ email: 1 }` (unique), `{ role: 1, status: 1 }`. `passwordHash` has `select: false`. |
| `departments` | `department.model.js` | Municipal service departments. Indexes: `{ normalizedName: 1 }` (unique), `{ isActive: 1 }`. |
| `issues` | `issue.model.js` | Civic complaints. Indexes: `{ issueNumber: 1 }` (unique), `{ location: '2dsphere' }`, `{ status: 1, departmentId: 1 }`, `{ reporterId: 1, createdAt: -1 }`, `{ visibility: 1, status: 1 }`. |
| `counters` | `counter.model.js` | Concurrency-safe atomic issue number sequence tracker (`seq`). |
| `issueevents` | `issueAudit.model.js` | Append-only audit events. Index: `{ issueId: 1, createdAt: 1 }`. (No `updatedAt`). |
| `notifications` | `notification.model.js` | In-app alerts. Indexes: `{ recipientId: 1, readAt: 1, createdAt: -1 }`. |
| `feedbacks` | `feedback.model.js` | Citizen resolution ratings. Indexes: `{ issueId: 1 }` (unique), `{ reporterId: 1 }`. |
| `sessions` | `connect-mongo` | Express session cookies with automatic TTL expiration. |

---

## 10. API Overview & Contracts

All endpoints return standardized JSON envelopes:
- **Success**: `{ success: true, message: string, data: any, meta: { timestamp, correlationId } }`
- **Error**: `{ success: false, message: string, statusCode: number, details?: array, meta: { timestamp, correlationId } }`

### Key Endpoint Groups
- **System Telemetry**: `GET /api/v1/health`, `GET /api/v1/ready`
- **Authentication**: `GET /api/v1/auth/csrf-token`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- **Issues**: `POST /api/v1/issues`, `GET /api/v1/issues`, `GET /api/v1/issues/my`, `GET /api/v1/issues/:id`, `PATCH /api/v1/issues/:id`, `DELETE /api/v1/issues/:id`
- **Workflow & Lifecycle**: `POST /api/v1/issues/:id/assign`, `POST /api/v1/issues/:id/transition`, `POST /api/v1/issues/:id/resolve`, `POST /api/v1/issues/:id/verify`, `POST /api/v1/issues/:id/reopen`, `GET /api/v1/issues/:id/timeline`
- **Queues**: `GET /api/v1/issues/staff/queue`, `GET /api/v1/issues/admin/triage`
- **Feedback**: `POST /api/v1/issues/:id/feedback`, `GET /api/v1/issues/:id/feedback`
- **Departments**: `GET /api/v1/departments`, `POST /api/v1/departments`, `PUT /api/v1/departments/:id`, `DELETE /api/v1/departments/:id`
- **Admin Staff**: `GET /api/v1/admin/staff`, `PATCH /api/v1/admin/staff/:id/department`, `PATCH /api/v1/admin/staff/:id/status`
- **Notifications**: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`
- **Analytics**: `GET /api/v1/analytics/citizen`, `GET /api/v1/analytics/staff`, `GET /api/v1/analytics/admin`, `GET /api/v1/analytics/hotspots`

*Full endpoint contracts, schemas, and status codes are documented in [docs/API.md](docs/API.md).*

---

## 11. Installation Instructions

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x or higher
- **MongoDB**: Local MongoDB v7.0 running on `localhost:27017` OR MongoDB Atlas connection URI

### Clone and Install
```bash
git clone <repository_url> CivicFix
cd CivicFix

# Install all workspace dependencies across client and server
npm install
```

---

## 12. Environment Configuration

CivicFix requires separate `.env` files for server and client:

### 1. Server Configuration (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civicfix_dev
SESSION_SECRET=civicfix_development_session_secret_32_characters_minimum!
SESSION_COOKIE_NAME=civicfix.sid
SESSION_TTL_HOURS=24
COOKIE_SAME_SITE=lax
TRUST_PROXY=1
CLIENT_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=20
EMAIL_ENABLED=false
LOG_LEVEL=debug
```

### 2. Client Configuration (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 13. Local Execution Steps

### Step 1: Provision Administrator Account
Run the secure administrative provisioning CLI:
```bash
node server/src/scripts/seed-admin.js --name "Civic Administrator" --email "admin@civicfix.gov" --role "admin"
```
*(The CLI prompts interactively for a strong password with masked input. Alternatively, pass `--password "<YourSecurePassword>"`. In production, passwords must be at least 12 characters with uppercase, lowercase, numbers, and symbols; default sample passwords are rejected.)*

To rotate existing administrative credentials securely at any time:
```bash
node server/src/scripts/seed-admin.js --email "admin@civicfix.gov" --rotate
```

### Step 2: Launch Development Servers
Run both backend and frontend concurrently:
```bash
npm run dev
```

### Step 3: Access Platform
- **Frontend SPA**: [http://localhost:5173](http://localhost:5173)
- **Public Grievance Explorer**: [http://localhost:5173/explore](http://localhost:5173/explore)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Liveness Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
- **Readiness Probe**: [http://localhost:5000/api/v1/ready](http://localhost:5000/api/v1/ready)

### Account Provisioning for Local Evaluation
- **Citizen**: Register any citizen account at [http://localhost:5173/register](http://localhost:5173/register).
- **Staff / Admin**: Provision or rotate internal accounts using `node server/src/scripts/seed-admin.js`. No default credentials are pre-seeded or hardcoded.

---

## 14. Testing Instructions & Test Metrics

### Run Complete Automated Test Suite (Backend & Frontend)
```bash
npm test
```
Or run separately:
```bash
npm run test:server   # Backend Vitest & Supertest integration tests
npm run test:client   # Frontend Vitest & React Testing Library component tests
```

### Current Test Suite Verification Metrics
- **Total Test Files**: 6 suites passed (6)
- **Total Tests**: 99 passed (99)
- **Failed Tests**: 0
- **Skipped Tests**: 0
- **Pass Rate**: **100% Green**

| Test File | Tests | Focus Areas |
|---|:---:|---|
| `server/auth.test.js` | 16 | Argon2id hashing, session cookies, HttpOnly security, CSRF defense, RBAC gates |
| `server/issues.test.js` | 22 | Atomic counter `CF-1001`, geospatial validation, mass assignment defense, citizen data isolation, privacy projections |
| `server/departments_lifecycle.test.js` | 25 | Department CRUD, normalized uniqueness, deactivation, deletion locks, staff assignment, lifecycle state machine, immutable audit events |
| `server/notifications_feedback_analytics.test.js` | 14 | In-app alerts, unread counts, mark-all-read, email fallback, 5-star feedback, aggregation analytics, hotspot clustering |
| `server/e2e_lifecycle.test.js` | 11 | Complete 10-step full-stack journey from registration to resolution, feedback, closure, and telemetry verification |
| `client/components.test.jsx` | 11 | Component rendering, status badges, accessibility alerts, role guards, empty states, and issue card layouts |

### Code Linting Gate
```bash
npm run lint
```
*Result: 0 errors, 0 warnings across client and server workspaces.*

### Production Build Gate
```bash
npm run build
```
*Result: Optimized bundle compiled in ~5.6s with vendor code splitting.*

---

## 15. Deployment Instructions

### Docker Multi-Container Deployment
```bash
docker-compose up --build -d
```
Starts:
1. `civicfix-mongodb`: MongoDB 7.0 container with persistent volume.
2. `civicfix-api`: Production Node.js multi-stage container running as non-root user `node` on port 5000.

*Detailed deployment guides for MongoDB Atlas, Render, Vercel, and AWS are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).*

---

## 16. Security Measures & Hardening

1. **Password Security**: Argon2id algorithm ($argon2id$v=19$m=65536,t=3,p=4) resisting GPU/ASIC cracking.
2. **Session Security**: Server-side storage in MongoDB (`connect-mongo`), signed cookies with `SameSite: Lax`, and `HttpOnly: true` (inaccessible to JavaScript).
3. **Double-Submit CSRF**: Synchronizer token verified on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
4. **NoSQL Injection Sanitization**: Middleware recursively strips `$` and `.` operators from `req.body`, `req.query`, and `req.params`.
5. **Security Headers**: `helmet` configured with strict Content Security Policy, X-Frame-Options, X-Content-Type-Options, and HSTS.
6. **Strict CORS**: Whitelist origin verification with credentials support (`Access-Control-Allow-Credentials: true`).
7. **Rate Limiting**: Tiered limiters preventing brute-force authentication attacks and DoS flooding.
8. **Broken Object-Level Authorization (BOLA)**: Strict service-level checks ensuring citizens cannot view other citizens' private reports or modify unrelated tickets.
9. **Location Privacy Policy**: Public queries round coordinates to ~100m grid; analytics hotspots round to ~1.1km and omit clusters below `minThreshold >= 2` to protect citizen residential anonymity.
10. **Sensitive Data Redaction**: Custom logger automatically masks passwords, tokens, session cookies, and SMTP credentials.

*Full threat model, OWASP Top 10 mitigations, and security controls are detailed in [docs/SECURITY.md](docs/SECURITY.md).*

---

## 17. Known Limitations & Technical Decisions

1. **Evidence File Storage Decision**: Binary multipart file uploads (e.g., raw images) require dedicated ClamAV virus scanning and S3 presigned URL infrastructure to be production-safe. To prevent uninspected local file storage vulnerabilities on Windows, evidence is stored as validated metadata strings (`evidenceNotes`, up to 1000 characters). Full S3 presigned URL integration is documented as the next production enhancement.
2. **Transactional Email in Development**: When live SMTP credentials are not configured (`EMAIL_ENABLED=false`), transactional emails gracefully log to the backend console without failing customer transactions.
3. **Single Database Daemon**: In local development, the application runs on a standalone local MongoDB instance. In production, MongoDB Atlas multi-region replica sets should be used for automated failover.
4. **Interactive Seeding on Windows Terminal**: Interactive readline CLI prompts can stall non-interactive CI runner environments; non-interactive CLI flags (`--name`, `--email`, `--role`, `--password`) are provided and used for automated provisioning.

---

## 📚 Academic Defense & Presentation Dossier

For complete viva voce preparation, system design diagrams, examiner Q&A transcripts, and demonstration walkthrough scripts, refer to:
- **[docs/ACADEMIC_DOSSIER.md](docs/ACADEMIC_DOSSIER.md)**: Academic defense guide, Viva Voce Q&A, and step-by-step evaluator script.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: State machine diagrams and architectural specifications.
- **[docs/API.md](docs/API.md)**: Complete REST API documentation.
- **[docs/SECURITY.md](docs/SECURITY.md)**: Security architecture and vulnerability mitigation matrix.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Cloud deployment and container orchestrations.
- **[docs/SETUP.md](docs/SETUP.md)**: Comprehensive setup guide and troubleshooting.
