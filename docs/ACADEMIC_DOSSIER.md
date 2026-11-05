# CivicFix — Major Academic Project Defense Dossier
## Civic Issue Reporting & Resolution Platform

**Author:** Individual Academic Project Submission  
**Course:** Modern Front-End Frameworks & Full-Stack SPA Development  
**Technology Stack:** React 19, Node.js 20, Express 4, MongoDB Atlas (Mongoose 8), Vitest, Vite 6  
**Implementation Status:** Production Hardened, 100% Passing Automated Tests, 0 Lint Warnings

---

## 1. Project Abstract

Municipal governance and civic maintenance operations often suffer from communication bottlenecks, non-transparent prioritization, and lack of accountability between citizens, departmental field crews, and municipal administrators. **CivicFix** is an enterprise-grade civic technology platform engineered as a modular monolith. It enables residents to report geo-tagged infrastructure defects, allows city administrators to triage and dispatch work orders to specialized bureaus, provides field technicians with a mobile-ready execution queue, and empowers citizens to verify resolutions and rate workmanship.

CivicFix is constructed with strict software engineering discipline: state-machine lifecycle enforcement, immutable audit logging with public identity masking, persistent in-app and transactional email notifications with idempotency safeguards, location-precision privacy algorithms (~100m grid rounding), and native MongoDB aggregation analytics without fabricated metrics or client-side simulations.

---

## 2. Problem Statement

Traditional civic grievance systems exhibit significant technical and operational shortcomings:
1. **Opaque Resolution Lifecycle**: Citizens submit complaints into a "black box" with no visibility into which department or technician is assigned, leading to high inquiry duplication and public frustration.
2. **Fragile State Management**: Typical academic prototypes manage ticket status through unconstrained client-side edits, allowing arbitrary status changes without role validation or mandatory justifications.
3. **Absence of Provenance & Auditability**: Lack of append-only audit ledgers makes it impossible to determine who changed ticket statuses, when work was performed, or why work was reopened.
4. **Citizen Privacy Risks**: Raw GPS coordinates of residential defects (e.g., backyard drainage or water leaks) are often exposed publicly, deanonymizing vulnerable citizens.
5. **Fabricated Metrics & Demo Scaffolding**: Academic projects frequently rely on seeded mock data or client-side hardcoded counters rather than genuine database aggregations.

---

## 3. Project Objectives

1. **Production-Quality Architecture**: Implement a secure, performant modular monolith with separate React 19 SPA frontend and Express.js REST API backend.
2. **Defensive Authentication & Session Security**: Deploy Argon2id password hashing, HttpOnly session cookies, Synchronizer Token CSRF defense, and strict 3-tier Role-Based Access Control (`citizen`, `staff`, `admin`).
3. **Robust Issue Lifecycle & Concurrency**: Implement an atomic sequence counter for human-readable issue IDs (`CF-1001`), GeoJSON geospatial indexing, and a finite state machine governing 9 explicit workflow states.
4. **Append-Only Audit Provenance**: Permanently record every assignment, reassignment, status transition, resolution note, and reopening into an immutable ledger with public identity masking.
5. **Durable Multi-Channel Notifications**: Build a database-backed notification center and transactional email service abstraction with a 10-second idempotency window.
6. **Location Privacy Policy**: Implement geospatial coordinate generalization (~100m public map rounding and ~1.1km grid clustering with `minThreshold >= 2`) to protect citizen residential anonymity.
7. **Real Operational Intelligence**: Engineer native MongoDB aggregation pipelines that derive live telemetry for citizens, technicians, and municipal executives without mock data.

---

## 4. Comparison: Existing Systems vs. CivicFix

| Evaluation Criteria | Existing Municipal Portals / Prototypes | CivicFix Architecture |
|---|---|---|
| **Architecture** | Spaghetti monolith or frontend-only mocks | Clean modular monolith with strict API contracts |
| **Authentication** | Plain text / bcrypt / JWT in localStorage | **Argon2id** (64MB) + **HttpOnly Session Cookies** (`SameSite: Lax`) |
| **CSRF Defense** | Non-existent or broken | **Synchronizer Token Pattern** with timing-safe validation |
| **Role Enforcement** | Client-side routing checks easily bypassed | Server-side role gates on every route; zero public escalation |
| **Lifecycle Transitions** | Unconstrained status updates | 9-state finite state machine with role and reason checks |
| **Audit Trail** | Mutable in-place status updates | Append-only **immutable ledger** (`IssueEvent`) |
| **Privacy Safeguards** | Raw GPS coordinates leaked on maps | **Location Precision Policy** (~100m rounding, cluster thresholding) |
| **Analytics Engine** | Hardcoded dashboard statistics | Native **MongoDB aggregation pipelines** |
| **Notifications** | Ephemeral or non-existent | Database-backed in-app center + resilient email fallback |
| **Verification & Testing** | Manual browser testing only | **88 automated integration and end-to-end tests** |

---

## 5. Functional & Non-Functional Requirements

### 5.1 Functional Requirements
- **FR-01 (Citizen Registration & Auth)**: Citizens can register, log in, manage sessions, and configure notification preferences. Public registration is strictly restricted to the citizen role.
- **FR-02 (Issue Reporting)**: Citizens can file civic issues with title, description, category, GeoJSON location coordinates, and visibility controls.
- **FR-03 (Atomic Numbering)**: Every report is assigned a concurrency-safe atomic sequence number (`CF-1001`, `CF-1002`).
- **FR-04 (Department Management)**: Administrators can create, edit, activate, and deactivate departments with normalized uniqueness. Destructive deletion of referenced departments is blocked.
- **FR-05 (Staff Assignment)**: Administrators can assign and reassign issues to verified active staff members belonging to the relevant department with mandatory reasons.
- **FR-06 (Technician Queue & Resolution)**: Field staff view assigned work orders, advance status to `in_progress`, and submit resolution notes with evidence references.
- **FR-07 (Verification & Quality Rating)**: Citizens can verify completed work to close tickets, submit 1–5 star satisfaction ratings and workmanship evaluations, or reopen tickets with reasons.
- **FR-08 (Public Map Exploration)**: Public visitors can view published issues on an interactive Leaflet map with time filters (`7d`, `30d`, `90d`, `all`).
- **FR-09 (Operational Telemetry)**: Live metrics computed via MongoDB aggregations for citizens, staff workloads, and administrative oversight.

### 5.2 Non-Functional Requirements
- **NFR-01 (Security)**: Argon2id password hashing, HttpOnly session cookies, CSRF protection, NoSQL injection sanitization, request size limits (100kb), and rate limiting.
- **NFR-02 (Privacy)**: Coordinates rounded on public maps; single isolated reports omitted from hotspot aggregations.
- **NFR-03 (Performance)**: Route-based code splitting reducing initial bundle size; indexed database queries with `< 50ms` execution times.
- **NFR-04 (Accessibility)**: WCAG 2.2 AA compliant semantic HTML, visible focus outlines, reduced motion support, screen-reader friendly status badges, and table/list map alternatives.
- **NFR-05 (Reliability & Observability)**: Distinct liveness (`/health`) and readiness (`/ready`) probes, request correlation IDs (`x-correlation-id`), structured logging, and graceful shutdown handling.

---

## 6. Database Schema Design & Indexing

```
┌────────────────────────┐         ┌────────────────────────┐
│         User           │         │       Department       │
├────────────────────────┤         ├────────────────────────┤
│ _id                    │         │ _id                    │
│ email (Unique)         │         │ name                   │
│ passwordHash           │         │ normalizedName (Unique)│
│ role (citizen/staff/   │         │ categoriesHandled []   │
│       admin)           │         │ isActive               │
│ departmentId ──────────┼────┐    └───────────┬────────────┘
│ status (active/susp)   │    │                │
│ notificationPrefs {}   │    │                │
└───────────┬────────────┘    │                │
            │                 │                │
            │ reporterId      │ assigneeId     │ departmentId
            ▼                 ▼                ▼
┌───────────────────────────────────────────────────────────┐
│                           Issue                           │
├───────────────────────────────────────────────────────────┤
│ _id                                                       │
│ issueNumber (Unique, Indexed: CF-1001)                    │
│ title, description, category, priority, status, visibility│
│ location: GeoJSON Point [lng, lat] (2dsphere index)       │
│ resolutionNotes, evidenceNotes, reopenedReason            │
│ createdAt, updatedAt, resolvedAt, closedAt                │
└───────────┬───────────────────────────────┬───────────────┘
            │                               │
            ▼ issueId                       ▼ issueId
┌────────────────────────┐         ┌────────────────────────┐
│       IssueEvent       │         │        Feedback        │
│    (Immutable Audit)   │         ├────────────────────────┤
├────────────────────────┤         │ _id                    │
│ _id                    │         │ issueId (Unique Index) │
│ issueId, actorId       │         │ citizenId              │
│ eventType, actorRole   │         │ rating (1-5)           │
│ previous/newStatus     │         │ resolutionQuality      │
│ reason, details {}     │         │ comment                │
│ createdAt (Append-Only)│         │ createdAt              │
└────────────────────────┘         └────────────────────────┘
```

---

## 7. Viva Voce Questions & Concise Technical Answers

### Q1: Why did you choose Argon2id over bcrypt for password hashing?
**Answer:** While bcrypt is acceptable, it is vulnerable to FPGA and ASIC-based hardware cracking attacks because it has fixed memory requirements (4 KB). Argon2id, the winner of the Password Hashing Competition (PHC), is memory-hard (configured to 64 MiB in CivicFix) and execution-time parameterized, providing superior defense against both GPU/ASIC parallel brute-force and side-channel cache timing attacks.

### Q2: Why did you use server-side sessions with HttpOnly cookies instead of storing JWTs in localStorage?
**Answer:** Storing authentication tokens in browser `localStorage` or `sessionStorage` exposes them to complete theft via any Cross-Site Scripting (XSS) vulnerability or rogue third-party dependency. CivicFix uses signed, server-side HttpOnly session cookies that are completely inaccessible to client-side scripts. Furthermore, server-side sessions stored in MongoDB allow instantaneous session revocation when an administrator suspends an account, whereas stateless JWTs cannot be revoked without maintaining a distributed denylist.

### Q3: How does CivicFix prevent Cross-Site Request Forgery (CSRF) with cookie authentication?
**Answer:** CivicFix combines two defense layers: `SameSite: Lax` cookie attributes and the **Synchronizer Token Pattern**. On state-changing mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`), the client must provide a cryptographically random token in the `x-csrf-token` header. The server performs a timing-safe byte comparison (`crypto.timingSafeEqual`) against the token stored in the server session.

### Q4: How is issue numbering handled to prevent race conditions during concurrent reports?
**Answer:** Generating issue IDs via timestamps or `countDocuments()` causes duplicate key collisions under concurrent submissions. CivicFix maintains a dedicated `counters` collection and uses MongoDB's atomic `findOneAndUpdate({ _id: 'issueNumber' }, { $inc: { seq: 1 } }, { new: true, upsert: true })`. This guarantees strictly monotonic, unique sequence generation without locking the database.

### Q5: What is your Location Precision Privacy Policy and why is it necessary?
**Answer:** Public civic tech platforms that display exact GPS coordinates inadvertently leak citizens' home addresses (e.g. reporting a broken water pipe or domestic drainage leak). CivicFix enforces two privacy transformations:
1. Public map exploration rounds coordinates to 3 decimal places (~100m grid precision).
2. Geographic hotspot clustering rounds coordinates to 2 decimal places (~1.1km cells) and filters out any clusters with fewer than `minThreshold >= 2` reports, ensuring isolated individual households are never exposed.

### Q6: How do you guarantee the audit trail cannot be manipulated?
**Answer:** The `IssueEvent` Mongoose model is append-only: it does not declare an `updatedAt` timestamp and exposes no update or delete routes in the API. Every status transition, assignment, resolution note, and reopening automatically creates an immutable audit record containing actor ID, role, previous state, new state, and reason. Unauthenticated public viewers receive a projected DTO that masks personal staff email addresses.

### Q7: How does your notification system handle retries without creating duplicates?
**Answer:** The `notificationDispatcher.js` enforces a 10-second idempotency deduplication window. Before creating a notification, it queries MongoDB for an identical `{ recipientId, relatedIssueId, type }` created within the last 10 seconds. If found, the duplicate event is silently suppressed.

### Q8: What is the difference between your `/health` and `/ready` endpoints?
**Answer:** `/health` is a **liveness probe** that verifies the Node.js process is responsive and event loop is running (used by container runtimes to restart deadlocked pods). `/ready` is a **readiness probe** that actively checks database connectivity (`readyState === 1`). If MongoDB is disconnecting or reconnecting, `/ready` returns HTTP 503 Service Unavailable, signaling load balancers to route traffic away from the instance until connectivity is restored.

---

## 8. Step-by-Step Live Demonstration Script

Follow this script during project demonstration:

1. **System Health & Observability (1 minute)**:
   - Navigate to `http://localhost:5000/api/v1/health` and `/api/v1/ready`.
   - Show HTTP 200 response, database connectivity status (`connected`), and request correlation ID header (`x-correlation-id`).
2. **Citizen Registration & Reporting (2 minutes)**:
   - Open frontend at `http://localhost:5173`.
   - Register a new citizen account (`demo.citizen@civicfix.org`).
   - Navigate to "Report Issue", select category "Roads", pick coordinates on the Leaflet map, and submit report.
   - Show instant receipt of in-app notification in the `NotificationBell` navbar widget.
   - Inspect issue number generated atomically (`CF-xxxx`).
3. **Admin Triage & Department Dispatch (2 minutes)**:
   - Log out and log in as Administrator (`admin@civicfix.gov`).
   - Open Admin Console -> "Issue Triage & Assignments".
   - Select the newly submitted issue, choose "Roadways Bureau", and assign technician.
   - Point out that the issue transitions to `assigned` and audit timeline records administrative action.
4. **Staff Technician Execution (2 minutes)**:
   - Log in as the assigned technician.
   - Open Staff Console -> "Assigned Work Orders".
   - Click "Start Work" (status moves to `in_progress`).
   - Click "Submit Resolution", enter asphalt repair notes and supervisor signoff reference.
   - Status updates to `resolved`.
5. **Citizen Verification & Feedback (2 minutes)**:
   - Switch back to citizen session.
   - Notice notification: "Resolution Completed — Awaiting Verification".
   - Open issue details, click "Rate Resolution Quality", give 5 stars and "Excellent" workmanship rating.
   - Click "Confirm & Close". Status advances to `closed`.
   - Review the complete immutable audit timeline showing chronological provenance.
6. **Public Map Exploration & Analytics (1 minute)**:
   - Log out and visit "Explore Issues" as an unauthenticated guest.
   - Toggle to "Map View": show marker on Leaflet map with location privacy banner.
   - Open Admin Console -> "Analytics & Hotspots": demonstrate real calculated resolution rates, category breakdowns, and geographic hotspot clusters.

