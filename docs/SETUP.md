# CivicFix — Local Development & Deployment Guide

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (Verified on Node.js v24.x)
- **NPM**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (default port 27017) OR a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

---

## 2. Environment Configuration

### Server Configuration (`server/.env`)

Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

| Variable | Description | Example (Local Dev) | Example (Production) |
|---|---|---|---|
| `NODE_ENV` | Application runtime | `development` | `production` |
| `PORT` | Backend HTTP port | `5000` | `5000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/civicfix_dev` | `mongodb+srv://user:pass@cluster.mongodb.net/civicfix?retryWrites=true&w=majority` |
| `SESSION_SECRET` | 32+ character secret | `civicfix_dev_session_secret_32chars_min!` | A randomly generated 64-char string |
| `SESSION_COOKIE_NAME` | Name of session cookie | `civicfix.sid` | `civicfix.sid` |
| `SESSION_TTL_HOURS` | Session validity duration | `24` | `24` |
| `COOKIE_SAME_SITE` | SameSite cookie policy | `lax` | `lax` |
| `CLIENT_ORIGIN` | Allowed Frontend URL | `http://localhost:5173` | `https://civicfix.org` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window | `900000` (15 min) | `900000` |
| `RATE_LIMIT_MAX` | Max general API calls | `500` | `100` |
| `AUTH_RATE_LIMIT_MAX` | Max auth calls per window | `100` | `10` |

### Client Configuration (`client/.env`)

Copy `client/.env.example` to `client/.env`:

```bash
cp client/.env.example client/.env
```

| Variable | Description | Value |
|---|---|---|
| `VITE_API_URL` | Base URL for API endpoints | `http://localhost:5000/api/v1` |

---

## 3. Running the Application

### Install Dependencies
```bash
npm install
```

### Start Development Mode
```bash
npm run dev
```
- Client running at: [http://localhost:5173](http://localhost:5173)
- Backend API running at: [http://localhost:5000](http://localhost:5000)

---

## 4. Manual Issue Reporting Workflow Verification

Follow these steps to verify Milestone 02 end-to-end:

1. **Register a Citizen Account**:
   - Navigate to [http://localhost:5173/register](http://localhost:5173/register)
   - Create a citizen account with a secure password of your choice (minimum 8 characters, containing uppercase, lowercase, digit, and symbol).
2. **Submit a Civic Report**:
   - Click **Report Issue** in the top navigation or on the Citizen Dashboard.
   - Enter a title (e.g. `Broken Streetlight at 5th Cross`), description, and select the `Streetlighting` category.
   - Click on the interactive map or enter manual coordinates to pin the location.
   - Select **Public Report** or **Private Report** and click **Submit Report**.
3. **Inspect Generated Report**:
   - The platform will redirect to the Issue Details view (`/issues/:id`).
   - Notice the unique, human-readable issue number (e.g. `CF-1001`).
   - Test the **Edit Report** feature (updates title/description while in `submitted` status).
4. **Inspect My Reports Feed**:
   - Navigate to [http://localhost:5173/my-reports](http://localhost:5173/my-reports).
   - Verify category and status filters, status badge, and pagination.
5. **Inspect Public Explore Feed**:
   - Open [http://localhost:5173/explore](http://localhost:5173/explore) in an incognito window (unauthenticated guest).
   - Verify that public reports are listed and searchable.
   - Verify that private reports are omitted from the explore feed.
   - Verify that clicking on a public report displays the sanitized Public DTO without exposing the citizen's personal email or reporter ID.
6. **Test Controlled Report Withdrawal**:
   - As the reporting citizen, open your submitted report and click **Withdraw**.
   - Confirm withdrawal. The status updates to `Withdrawn`, preserving the record in your account while immediately hiding it from the public explore feed.

---

## 5. Running Automated Tests & Linter

```bash
# Run all automated backend integration and frontend component tests
npm test

# Run ESLint across server and client workspaces
npm run lint

# Build client production bundle
npm run build
```
