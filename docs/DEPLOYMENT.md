# CivicFix — Production Deployment & Operations Guide

This guide details the deployment, scaling, security hardening, and disaster recovery procedures for **CivicFix**.

---

## 1. Architecture Topology

CivicFix is designed for flexible deployment across modern cloud platforms:

```
[ Client Browser ]
        │
        ├── HTTPS / Static Assets ────────► [ Frontend Host: Vercel / Netlify / Nginx ]
        │                                    (Single-Page Application: React 19 + Vite)
        │
        └── HTTPS / JSON REST API ────────► [ Backend Host: Render / Railway / AWS ECS ]
            (Credentials: Include)           (Node.js 20.x + Express Modular Monolith)
                                                     │
                                                     ├── Mongoose (TLS 1.3)
                                                     ▼
                                            [ Database: MongoDB Atlas ]
                                            (Replicas, 2dsphere Geospatial Index)
```

---

## 2. Environment Variables Specification

### 2.1 Backend (`server/.env`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | `enum` | Yes | `development` | Set to `production` in production environments |
| `PORT` | `number` | Yes | `5000` | HTTP port on which Express listens |
| `MONGODB_URI` | `string` | Yes | - | MongoDB Atlas connection URI (`mongodb+srv://...`) |
| `SESSION_SECRET` | `string` | Yes | - | Cryptographic secret (min 32 characters) for signing session cookies |
| `SESSION_COOKIE_NAME` | `string` | No | `civicfix.sid` | Name of the session cookie |
| `SESSION_TTL_HOURS` | `number` | No | `24` | Session lifetime in hours |
| `COOKIE_SAME_SITE` | `enum` | No | `lax` | `lax` for same-domain; `none` for cross-domain deployments |
| `CLIENT_ORIGIN` | `string` | Yes | `http://localhost:5173` | Primary frontend origin for CORS |
| `ALLOWED_ORIGINS` | `string` | No | - | Comma-separated list of allowed origins (e.g. preview and production URLs) |
| `TRUST_PROXY` | `number` | No | `1` | Number of reverse proxy hops (e.g., Cloudflare, ALB, Render) |
| `RATE_LIMIT_WINDOW_MS`| `number` | No | `900000` | 15-minute rate limit window in ms |
| `RATE_LIMIT_MAX` | `number` | No | `100` | Max general API requests per IP per window |
| `AUTH_RATE_LIMIT_MAX` | `number` | No | `10` | Max login/register attempts per IP per window |
| `EMAIL_ENABLED` | `boolean`| No | `false` | Enables transactional SMTP email delivery |
| `SMTP_HOST` | `string` | Cond. | `localhost` | SMTP host (e.g., SendGrid, Mailgun, Amazon SES) |
| `SMTP_PORT` | `number` | Cond. | `587` | SMTP submission port |
| `SMTP_USER` | `string` | Cond. | - | SMTP authentication username |
| `SMTP_PASS` | `string` | Cond. | - | SMTP authentication password |
| `EMAIL_FROM` | `string` | No | `CivicFix <notifications@civicfix.org>` | Verified outgoing sender address |
| `LOG_LEVEL` | `enum` | No | `info` | Logging verbosity (`error`, `warn`, `info`, `debug`) |

### 2.2 Frontend (`client/.env`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `VITE_API_URL` | `string` | Yes | `/api/v1` | Base URL for API calls. Use `/api/v1` when reverse proxied, or `https://api.civicfix.org/api/v1` for cross-domain |

---

## 3. Production Cookie & CORS Strategy

### Option A: Same-Domain Deployment (Recommended)
- **Frontend**: `https://civicfix.org`
- **Backend**: `https://civicfix.org/api` (via Nginx or Cloudflare reverse proxy routing)
- **Configuration**:
  - `COOKIE_SAME_SITE=lax`
  - `cookie.secure=true`
  - Eliminates third-party cookie blocking in modern browsers (Safari ITP, Chrome Privacy Sandbox).

### Option B: Cross-Domain Deployment (e.g. Vercel + Render)
- **Frontend**: `https://civicfix.vercel.app`
- **Backend**: `https://civicfix-api.onrender.com`
- **Configuration**:
  - `CLIENT_ORIGIN=https://civicfix.vercel.app`
  - `ALLOWED_ORIGINS=https://civicfix.vercel.app`
  - `COOKIE_SAME_SITE=none`
  - `cookie.secure=true` (Required by all browsers when `SameSite=none`)
  - `TRUST_PROXY=1` (Required so Express accurately detects the `X-Forwarded-Proto: https` header from the reverse proxy)

---

## 4. Containerized Deployment with Docker & Compose

### 4.1 Running with Docker Compose
```bash
# 1. Clone repository
git clone https://github.com/your-username/civicfix.git
cd civicfix

# 2. Configure production secrets in .env
cp server/.env.example server/.env
# Edit server/.env with real MongoDB and Session Secret

# 3. Build and launch services
docker-compose up -d --build

# 4. Verify running health
docker-compose ps
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/ready
```

### 4.2 Initializing Administrative User in Production Container
```bash
docker-compose exec api npm run seed:admin
```

---

## 5. Cloud Platform Deployment Guides

### 5.1 MongoDB Atlas Setup
1. Create a dedicated MongoDB Atlas cluster (M10+ recommended for automated backups and zero-downtime scaling).
2. Under **Network Access**, whitelist your application server IP addresses or enable AWS VPC Peering.
3. Under **Database Access**, create a least-privilege user with `readWrite` role scoped strictly to the `civicfix` database.
4. Copy the connection string: `mongodb+srv://<db_user>:<db_pass>@<cluster>.mongodb.net/civicfix?retryWrites=true&w=majority`.

### 5.2 Backend on Render / Railway
1. Create a new **Web Service** connected to your repository.
2. Root directory: `.` (or `/server`).
3. Build command: `npm install --workspace=server --omit=dev`.
4. Start command: `node server/src/server.js`.
5. Add Environment Variables from Section 2.1.
6. Configure health check path: `/api/v1/health`.

### 5.3 Frontend on Vercel
1. Import repository on Vercel.
2. Root directory: `client`.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variable: `VITE_API_URL=https://<your-backend-domain>/api/v1`.

---

## 6. Observability, Health Checks & Monitoring

CivicFix separates **Liveness** from **Readiness**:

- **Liveness Probe**:
  - Route: `GET /health` or `GET /api/v1/health`
  - Status: Always returns `200 OK` if the Node.js event loop is responsive.
  - Used by container orchestrators (Kubernetes, AWS ECS) to detect process deadlocks and trigger container restarts.
- **Readiness Probe**:
  - Route: `GET /ready` or `GET /api/v1/ready`
  - Status: Validates that MongoDB connectivity state is `connected` (`readyState === 1`).
  - Returns `200 OK` when ready; returns `503 Service Unavailable` if the database is reconnecting or unavailable.
  - Used by load balancers to temporarily route traffic away from unready instances during deployments or network blips.

---

## 7. Backup and Disaster Recovery

### 7.1 Automated Cloud Backups
When deployed on MongoDB Atlas:
- **Continuous Backups**: Point-in-time recovery with 1-minute granularity for the last 24 hours.
- **Daily Snapshots**: Retained for 7 to 30 days.

### 7.2 Manual Backup (`mongodump`)
```bash
mongodump --uri="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/civicfix" \
          --archive="civicfix_backup_$(date +%Y%m%d_%H%M%S).gz" \
          --gzip
```

### 7.3 Restoration Procedure (`mongorestore`)
```bash
mongorestore --uri="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/civicfix" \
             --archive="civicfix_backup_YYYYMMDD_HHMMSS.gz" \
             --gzip \
             --drop
```

### 7.4 Target Metrics
- **Recovery Point Objective (RPO)**: < 1 hour (Atlas automated snapshots).
- **Recovery Time Objective (RTO)**: < 15 minutes to provision replacement cluster and restore snapshot.

