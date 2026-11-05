# CivicFix — Application Security & Threat Model

This document outlines the security architecture, threat model, mitigation strategies, and privacy safeguards implemented in **CivicFix**.

---

## 1. Threat Model & Security Architecture

CivicFix handles municipal infrastructure reports, citizen personal data, and administrative workflows. The security design addresses OWASP Top 10 vulnerabilities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Incoming HTTP Traffic                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                      [ Helmet Security Headers ]
                                    │
                                    ▼
                        [ Strict CORS Policy ]
                                    │
                                    ▼
                     [ Correlation ID Generator ]
                                    │
                                    ▼
                      [ General & Auth Rate Limits ]
                                    │
                                    ▼
                    [ Request Size Limiter (100kb) ]
                                    │
                                    ▼
                     [ NoSQL Injection Sanitizer ]
                                    │
                                    ▼
                  [ HttpOnly Cookie Session Engine ]
                                    │
                                    ▼
                  [ Synchronizer Token CSRF Defense ]
                                    │
                                    ▼
                     [ Role-Based Access Control ]
                                    │
                                    ▼
                    [ Object-Level Authorization ]
                                    │
                                    ▼
                [ Zod Schema & Business Logic Validation ]
                                    │
                                    ▼
                     [ Atomic Database Operations ]
```

---

## 2. Authentication & Credential Security

### 2.1 Password Storage: Argon2id
CivicFix uses **Argon2id**, the winner of the Password Hashing Competition (PHC) and OWASP's primary recommendation for password storage.
- **Algorithm**: `argon2id` (hybrid of Argon2d and Argon2i, providing resistance against GPU cracking and side-channel cache attacks).
- **Memory Cost**: `65536 KiB` (64 MiB).
- **Time Cost**: `3 iterations`.
- **Parallelism**: `1 lane`.
- **Salting**: Cryptographically random 16-byte salt generated per password automatically by the native Argon2 library.

### 2.2 Session Management & Fixation Protection
- **Storage**: Enterprise server-side sessions stored in MongoDB (`connect-mongo`).
- **Cookie Security**:
  - `httpOnly: true` (Inaccessible to JavaScript, preventing XSS-based session theft).
  - `secure: true` (Enforced in production, transmitted over HTTPS only).
  - `sameSite: 'lax'` (or `'none'` for cross-origin setups).
  - Signed with cryptographic HMAC using `SESSION_SECRET` (min 32 characters).
- **Session Regeneration**:
  - `req.session.regenerate()` is executed upon registration and login to generate a new session ID, completely neutralizing **Session Fixation** attacks.
- **Session Invalidation**:
  - On logout (`POST /api/v1/auth/logout`), the session document is destroyed in MongoDB and `res.clearCookie()` immediately purges the client cookie.
- **Account Suspension Enforcement**:
  - The `authenticate` middleware queries the current account status on every request. If an administrator suspends an account, the active session is destroyed immediately, and subsequent requests receive `403 Forbidden`.

---

## 3. Cross-Site Request Forgery (CSRF) Defense

CivicFix employs the **Synchronizer Token Pattern**:
1. When a session is established or upon calling `GET /api/v1/auth/csrf-token`, a cryptographically random 32-byte hexadecimal token is generated and stored in `req.session.csrfToken`.
2. On every state-changing HTTP request (`POST`, `PUT`, `PATCH`, `DELETE`), the client must send the token in the `x-csrf-token` request header.
3. The server performs a **timing-safe comparison** (`crypto.timingSafeEqual`) between the session token and the header token.
4. Mismatched or absent tokens trigger an immediate `403 Forbidden`.
5. Safe methods (`GET`, `HEAD`, `OPTIONS`) and liveness probes are exempt.

---

## 4. Injection & Input Sanitization

### 4.1 NoSQL Query Injection Defense
To prevent attacks where query parameters or JSON bodies contain MongoDB query operators (`{ "username": { "$gt": "" } }`):
- Dedicated `sanitizeInputs` middleware recursively traverses `req.body`, `req.query`, and `req.params`.
- Any keys starting with `$` or containing `.` are stripped before reaching route controllers.
- Strict Zod schemas validate that incoming identifiers match valid hexadecimal ObjectIds and expected string formats.

### 4.2 Cross-Site Scripting (XSS) Defense
- React automatically escapes all JSX expressions, preventing reflected and stored DOM-based XSS.
- The transactional email service (`emailService.js`) explicitly HTML-escapes all dynamic parameters (`title`, `issueNumber`, `reporterName`, `reason`, `notes`) before assembling email templates.

### 4.3 Request Size Limiting
- `express.json({ limit: '100kb' })` and `express.urlencoded({ extended: true, limit: '100kb' })` block memory-exhaustion payload bombing attacks.

---

## 5. Authorization & Broken Object-Level Authorization (BOLA)

CivicFix enforces access control at both the **role** level and the **object** level:

### 5.1 Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Guest | Citizen | Staff | Admin |
|---|---|---|---|---|
| Register Account | Public (Citizen only) | Denied | Denied | Denied |
| Submit Issue | Denied | Allowed | Allowed | Allowed |
| Edit Submitted Issue | Denied | Owner only (if submitted) | Denied | Denied |
| Withdraw Issue | Denied | Owner only | Denied | Denied |
| Public Explore / Map | Allowed (Masked DTO) | Allowed | Allowed | Allowed |
| Assign / Reassign Issue | Denied | Denied | Denied | Allowed |
| Transition Issue (Start Work) | Denied | Denied | Assigned Staff / Admin | Allowed |
| Resolve Issue | Denied | Denied | Assigned Staff / Admin | Allowed |
| Verify & Close Issue | Denied | Owner Citizen | Denied | Allowed |
| Reopen Issue | Denied | Owner Citizen | Denied | Allowed |
| Submit Resolution Feedback | Denied | Owner Citizen | Denied | Allowed |
| View Private Feedback | Denied | Owner Citizen | Assigned Staff | Allowed |
| Department Management (CRUD) | Denied | Denied | Denied | Allowed |
| Staff Management & Suspension | Denied | Denied | Denied | Allowed |
| Staff Queue | Denied | Denied | Allowed (Own tasks) | Allowed |
| Admin Triage Queue | Denied | Denied | Denied | Allowed |
| Admin Platform Analytics | Denied | Denied | Denied | Allowed |

### 5.2 Privilege Escalation Defense
- In `auth.service.js`, the registration handler hardcodes `role: ROLES.CITIZEN`.
- Any `role`, `departmentId`, or `status` attributes supplied in the public registration request body are stripped and ignored.
- Staff and administrator accounts can only be provisioned through secure administrative APIs or the CLI tool (`npm run seed:admin`).

### 5.3 Last Administrator Protection
- The staff management service (`admin.service.js`) enforces that an administrator cannot suspend the last active administrator account in the database (`countDocuments({ role: 'admin', status: 'active' }) <= 1`), preventing accidental administrative lockouts.

---

## 6. Citizen Location & Data Privacy

### 6.1 Location Precision Privacy Policy
- **Public Map View**: Coordinates returned on public issue endpoints are generalized to neighborhood grid precision (~100m, 3 decimal places) to safeguard citizen home addresses.
- **Geographic Hotspots**: Hotspot aggregation rounds coordinates to 2 decimal places (~1.1km grid cells) and enforces `minThreshold >= 2`. Isolated reports (<2) are omitted from hotspot results to prevent triangulation.

### 6.2 Audit Timeline Masking
- The append-only audit trail (`IssueEvent`) records full staff names and email addresses internally.
- When requested by unauthenticated public visitors, staff and administrator emails are masked as generic municipal titles ("Municipal Staff", "Civic Administrator").

### 6.3 Structured Logging Redaction
The application logger (`logger.js`) recursively scans context objects and masks sensitive keys with `[REDACTED]`:
- `password`, `token`, `csrfToken`, `secret`, `cookie`, `authorization`, `smtpPass`, `sessionSecret`, `passwordHash`.
- Correlation IDs are logged on every request without printing sensitive request payloads.

