<div align="center">

# AutoCare360

**Complete vehicle maintenance, simplified.**

A full-stack MERN SaaS that keeps every vehicle you own — cars, bikes, scooters, EVs, trucks, tractors and more — on a correct, vehicle-specific maintenance schedule, and tracks the service history, expenses, documents and reminders that go with it.

React 19 · Vite · Tailwind CSS 4 · Redux Toolkit · Node.js · Express 5 · MongoDB · Mongoose

</div>

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [Database setup](#database-setup)
8. [Seed data](#seed-data)
9. [Demo credentials](#demo-credentials)
10. [API overview](#api-overview)
11. [Deployment](#deployment)
12. [Security](#security)
13. [Project structure](#project-structure)
14. [Future improvements](#future-improvements)

---

## Overview

Most maintenance trackers are glorified to-do lists: you type in "oil change" and a date. AutoCare360 works the other way round. You describe the vehicle — type, fuel, powertrain, transmission, make and model — and the app **generates the right maintenance plan for it** from a catalog of 187 maintenance templates:

- An **electric scooter** gets battery health checks, motor-controller inspections and brake service, and *never* an engine-oil change.
- A **petrol + CNG hatchback** additionally gets CNG kit inspection, CNG filter replacement and the statutory cylinder hydro-test.
- A **tractor** or **construction machine** is scheduled on **engine hours**, not kilometres, with hydraulics and PTO items.
- Manufacturer-specific templates override generic ones (for example, a model-specific drive-belt interval replaces the generic one).

Every item is due on a **whichever-comes-first** basis (time *or* distance/hours). It moves through *Up to date → Due soon → Due → Overdue* as the calendar advances and as you log odometer readings. Logging a service completes the matching items, opens the next occurrence from the new baseline, records the expense, and updates the vehicle's **health score**.

## Features

### Vehicles
- 20 vehicle types (car, SUV, sedan, hatchback, MPV, pickup, truck, bus, motorcycle, scooter, e-scooter, e-motorcycle, EV car/SUV, van, commercial vehicle, tractor, construction equipment, trailer, other) and 9 fuel types, including dual-fuel (petrol + CNG/LPG).
- A multi-step add-vehicle wizard with a **live preview of the maintenance checklist** the vehicle will get; you can remove items before saving and restore them later.
- Odometer / hour-meter logging with history and validation (a reading can't go backwards).
- Vehicle detail page with tabs: **Overview · Maintenance · Service History · Expenses · Documents · Reminders · Notes**.
- **Health score (0–100)** per vehicle: 90+ *Excellent*, 75–89 *Good*, 50–74 *Needs attention*, below 50 *Critical*.
- A printable, report-style vehicle page, plus a server-generated PDF report.

### Maintenance engine
- Template matching by vehicle type, type group, fuel, powertrain (ICE / hybrid / EV / FCEV), transmission, make (with exclusions) and model; same-code templates override each other by specificity.
- Status thresholds that scale with the interval (a 3-month item goes "due soon" much closer to its date than a 2-year item).
- Actions: **complete**, **skip** (with a reason), **reschedule** (to a date and/or reading), and add **custom** items.
- Filters by vehicle, status, category, priority and due-date range, sorted by urgency; CSV and PDF export.

### Service history
- Service records with service centre, mechanic, parts (quantity × unit price), labour, taxes, discount, rating and notes.
- **Invoice and photo attachments** (Cloudinary, or local disk in development).
- Saving a record completes the linked maintenance items, updates the odometer, and creates the matching expense automatically.

### Expenses
- 14 categories (fuel, charging, maintenance, repairs, insurance, registration, taxes, parking, toll, accessories, cleaning, tyres, parts, other), with fuel/charging quantity and price per unit.
- Monthly trend, category breakdown, per-vehicle spend and **running cost per km** (or per engine hour for hour-meter vehicles).
- Date-range presets and a custom range; CSV and PDF export.

### Reminders and notifications
- Reminders created automatically for maintenance and document expiry, plus custom reminders with 7 / 15 / 30 / custom-day lead times and monthly/yearly repeats.
- A notification centre with an unread badge. Alerts are grouped per vehicle ("14 maintenance items are overdue"), so you get one alert per vehicle rather than a flood.
- Optional email for overdue items and expiring documents (Nodemailer; logged to the console when SMTP isn't configured).
- A background job (`node-cron`, every 30 minutes) re-evaluates statuses and fires due reminders.

### Documents
- A vault for RC, insurance, PUC, fitness certificates, permits, warranties, invoices and driving licences.
- Expiry badges (expired / expiring in N days / valid), expiring-soonest sorting, and automatic reminders. Expired documents lower the vehicle's health score.

### Dashboard
- KPI cards, spend by month and category, cost trend, mileage trend, maintenance completion, fleet health.
- Smart alerts, an upcoming-maintenance timeline and recent activity.
- Every chart has an accessible **table view**, a colour-blind-validated palette, and theme-aware dark-mode colours.

### Admin panel
- Platform analytics: user and vehicle growth, spend tracked, maintenance status mix, most-completed items.
- User management: create, edit, change role, **block/unblock**, delete.
- Catalog management: **maintenance templates**, **categories**, **vehicle types** and **fuel types**, all stored in the database. A new vehicle type only needs a group to inherit that group's templates. Templates can be re-applied to existing vehicles.
- Read-only views of every vehicle and maintenance item across accounts.

### Product polish
- Global search / command palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>) across vehicles, maintenance, services, expenses and documents.
- **Light / dark / system** themes, a fully responsive layout with a mobile bottom navigation, and `prefers-reduced-motion` support plus an in-app "Reduce motion" setting.
- URL-synced filters, pagination and sorting; skeleton loading, empty and error states; toast feedback.
- Friendly error messages. Stack traces never reach the browser.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7 (lazy routes), Redux Toolkit, Tailwind CSS 4, Recharts 3, Framer Motion, React Hook Form + Zod, Axios, date-fns, Lucide icons, react-hot-toast |
| Backend | Node.js 20+, Express 5 (ES modules), Mongoose 9, Zod 4 request validation |
| Database | MongoDB 6+ (local or MongoDB Atlas) |
| Auth | JWT access token (in memory) + rotating refresh token in an httpOnly cookie, bcrypt password hashing |
| Files | Multer → Cloudinary (local-disk fallback for development) |
| Email | Nodemailer (console fallback) |
| Reports | PDFKit (PDF), CSV with formula-injection protection |
| Jobs | node-cron |
| Security | Helmet, CORS allow-list, express-rate-limit, NoSQL-injection sanitization |

## Architecture

```
┌──────────────────────── client (Vercel) ────────────────────────┐
│ React SPA · Router · Redux Toolkit · Axios (auto token refresh) │
└───────────────────────────────┬─────────────────────────────────┘
                                │  /api/*  (JSON + multipart)
┌───────────────────────────────▼──────── server (Render/Railway) ┐
│ Express 5                                                       │
│ helmet · cors · rate-limit · sanitize · cookie-parser           │
│ routes → zod validation → auth/role guard → controllers         │
│                                                                 │
│ services/                                                       │
│   maintenanceEngine  pure due-date / reading / status / health  │
│   scheduleService    template matching, occurrences, alerts     │
│   serviceRecord · expense · reminder · dashboard · export       │
│   storageService (Cloudinary | disk) · emailService (SMTP|log)  │
│ jobs/  30-minute status + reminder sweep                        │
└──────────────┬───────────────────────────────────┬──────────────┘
               │ Mongoose                          │
        ┌──────▼───────┐                    ┌──────▼──────┐
        │ MongoDB Atlas│                    │ Cloudinary  │
        └──────────────┘                    └─────────────┘
```

### How scheduling works

1. **Resolve templates.** Every active template is matched against the vehicle spec. When several templates share a `code`, the most specific one wins (model › make › fuel › transmission › powertrain › type › group).
2. **Create occurrences.** Each item is stored as one open `MaintenanceTask` occurrence, due at `last + intervalMonths` and/or `last + intervalKm`. The baseline is the last service, a recent purchase, or today at the current reading.
3. **Evaluate.** The status is the *worse* of the date-based and reading-based results. The "due" and "due soon" windows scale with the interval (for example, a 10,000 km / 12-month item is *due soon* 30 days or 1,500 km ahead).
4. **Close and reopen.** Completing or skipping an occurrence closes it and opens the next one from the new baseline, so history is simply the closed occurrences.
5. **Score.** Health starts at 100. The worst overdue item costs its full priority weight (critical 36, high 28, medium 16, low 8), further overdue items add log-scaled weight, and due / due-soon items and expired documents add smaller penalties.

The full blueprint — database schema, every endpoint, every page and the folder layout — is in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Getting started

### Prerequisites

- **Node.js 20+** (developed on Node 24)
- **MongoDB 6+**, either running locally on `mongodb://127.0.0.1:27017` or a free MongoDB Atlas cluster

### Installation

```bash
git clone <your-repo-url> autocare360
cd autocare360

# install root, server and client dependencies
npm run install:all

# create the server environment file
cp server/.env.example server/.env        # Windows: copy server\.env.example server\.env
```

Generate two different JWT secrets and paste them into `server/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then load the catalog and demo data, and start both apps:

```bash
npm run seed
npm run dev
```

| App | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| API | http://localhost:5000/api (health: `/api/health`) |

In development, Vite proxies `/api` and `/uploads` to the API, so the browser only ever talks to one origin.

### Scripts (repository root)

| Command | What it does |
| --- | --- |
| `npm run install:all` | Installs root, `server/` and `client/` dependencies |
| `npm run dev` | Starts the API (nodemon) and the web app (Vite) together |
| `npm run seed` | **Drops the database** and loads the catalog + demo data |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Starts the API in production mode |

Inside `server/`, `npm run seed:catalog` refreshes only the catalog (vehicle types, fuel types, categories, templates) and leaves user data untouched.

## Environment variables

### Server — `server/.env`

Copy from [`server/.env.example`](server/.env.example). **Never commit `.env`**; it is ignored by git.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | – | `development` or `production` |
| `PORT` | – | API port (default `5000`) |
| `SERVER_URL` | – | Public URL of the API (used for local upload links) |
| `CLIENT_URL` | ✔ | Allowed frontend origin(s), comma-separated. The first is used in email links. |
| `APP_TIMEZONE` | – | Timezone for monthly buckets (default `Asia/Kolkata`) |
| `MONGODB_URI` | ✔ | MongoDB connection string |
| `JWT_SECRET` | ✔ in prod | Access-token signing secret |
| `JWT_REFRESH_SECRET` | ✔ in prod | Refresh-token signing secret (must differ from `JWT_SECRET`) |
| `JWT_ACCESS_EXPIRES_IN` | – | Access-token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_DAYS` | – | Refresh-session lifetime in days (default `7`) |
| `COOKIE_SAME_SITE` | – | `lax`, `strict` or `none`. Default: `lax` in development, `none` in production. |
| `COOKIE_SECURE` | – | `true`/`false`. Default: `true` in production. |
| `TRUST_PROXY` | – | Number of reverse proxies in front of the API (`1` on Render/Railway, `2` behind the Vercel rewrite) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | – | Enables Cloudinary uploads. Without them, files go to `server/uploads/`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | – | Enables email. Without `SMTP_HOST`, emails are printed to the server console. |
| `EMAIL_FROM` | – | Sender address, e.g. `"AutoCare360 <no-reply@yourdomain.com>"` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | – | Admin login created by `npm run seed` (defaults are for local development only) |
| `ENABLE_JOBS` | – | `false` disables the 30-minute background sweep |

In development the API boots without JWT secrets (it warns and uses throw-away values). **In production it refuses to start without them.**

### Client — `client/.env` (optional)

Copy from [`client/.env.example`](client/.env.example). Every `VITE_*` value is bundled into public JavaScript, so **no secrets ever go here**.

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. Leave empty to use `/api` (dev proxy / Vercel rewrite). Set an absolute URL only for cross-origin setups. |
| `VITE_API_ORIGIN` | Origin serving `/uploads/*`. Only needed when the API is cross-origin *and* files are stored on disk. |
| `VITE_DEV_API_TARGET` | Where the Vite dev server proxies `/api` (default `http://localhost:5000`) |

## Database setup

**Local MongoDB.** Install MongoDB Community Server (or run `docker run -d -p 27017:27017 --name mongo mongo:7`). Keep the default `MONGODB_URI=mongodb://127.0.0.1:27017/autocare360`.

**MongoDB Atlas.**
1. Create a free M0 cluster.
2. Under **Database Access**, add a database user with a strong password.
3. Under **Network Access**, allow your IP (and `0.0.0.0/0` for Render/Railway, which use dynamic egress IPs).
4. Copy the connection string into `MONGODB_URI` and add the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/autocare360?retryWrites=true&w=majority`

Indexes are declared on the Mongoose models and built automatically on first start. They include owner-scoped indexes, a per-owner unique registration number, the "one open occurrence per vehicle + item" partial unique index, and a 120-day TTL on notifications.

## Seed data

```bash
npm run seed
```

The seed **drops the target database**, then loads:

- **Catalog:** 20 vehicle types, 9 fuel types, 13 maintenance categories and 187 maintenance templates.
- **Demo garage** (about two to three years of realistic, deterministic history):

| Vehicle | Notes |
| --- | --- |
| Toyota Glanza (petrol + CNG) | CNG kit, filter and cylinder hydro-test items |
| Hyundai Creta (petrol) | Family SUV that has been neglected, with many overdue items |
| Tata Nexon EV | EV-only plan: no engine oil, spark plugs or clutch |
| Royal Enfield Classic 350 | Chain and drive care |
| Honda Activa 6G | Scooter-specific plan (CVT, drum brakes) |
| Ola S1 Pro | Electric scooter |
| Tata Ace (diesel) | Light commercial vehicle with permit and fitness certificate |
| Mahindra tractor | Scheduled on engine hours, with hydraulics and PTO |

- Service records with generated invoice PDFs, fuel and charging logs, running costs, insurance / PUC / RC / permit documents (some expired or expiring), custom reminders, and notifications.
- Nine additional users (one of them blocked) so the admin panel has realistic data.

To point the seed at Atlas, set `MONGODB_URI` in `server/.env` before running it. Don't run it against a database whose data you want to keep.

## Demo credentials

The seed creates two accounts for local development:

| Role | Email | Password |
| --- | --- | --- |
| User | `demo@autocare360.com` | `Demo@12345` |
| Admin | `admin@autocare360.com` | `Admin@12345` |

There is **one sign-in form for everyone**. Nothing in the UI advertises these accounts or the admin panel; you type the email and password on **Sign in** like any user.
- Regular users land on their dashboard (`/app`).
- Admins are recognised by their role and taken to the admin panel (`/admin`). Only admins see the *Admin panel* link in the sidebar, and the API rejects admin routes for everyone else.

**Before seeding a shared or deployed database**, set your own admin login in `server/.env`:

```env
SEED_ADMIN_EMAIL=you@yourdomain.com
SEED_ADMIN_PASSWORD=a-long-unique-password
```

Also change or remove the demo account on any public deployment you don't want visitors to modify.

## API overview

Base URL: `/api`. All non-auth routes require `Authorization: Bearer <accessToken>`; `/api/admin/*` also requires the `admin` role.

**Response envelope**

```jsonc
// success
{ "success": true, "message": "Vehicle created", "data": { … }, "meta": { "pagination": { "total": 40, "page": 1, "limit": 12, "totalPages": 4, "hasNext": true, "hasPrev": false } } }
// error — no stack traces, ever
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "errors": [{ "field": "odometer", "message": "…" }] }
```

**Auth flow.**
1. `POST /auth/login` returns a 15-minute access token in the body and sets an httpOnly refresh cookie scoped to `/api/auth`.
2. On a `401`, the client calls `POST /auth/refresh` once (single-flight across concurrent requests). The refresh token is **rotated** on every use and stored hashed.
3. Replaying an already-rotated token revokes every session for that user.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password/:token` · `GET /auth/me` |
| Profile | `PATCH /users/me` · `PATCH /users/me/password` · `PATCH /users/me/preferences` · `POST /users/me/avatar` |
| Catalog | `GET /meta` · `POST /maintenance/preview` |
| Vehicles | `GET/POST /vehicles` · `GET/PATCH/DELETE /vehicles/:id` · `GET /vehicles/:id/overview` · `PATCH /vehicles/:id/odometer` · `POST /vehicles/:id/image` · `POST /vehicles/:id/sync-schedule` · notes CRUD |
| Maintenance | `GET/POST /maintenance` · `GET /maintenance/summary` · `GET/PATCH/DELETE /maintenance/:id` · `POST /maintenance/:id/complete` · `…/skip` · `…/reschedule` |
| Service records | `GET/POST /service-records` · `GET/PATCH/DELETE /service-records/:id` · `DELETE /service-records/:id/photos/:photoId` |
| Expenses | `GET/POST /expenses` · `GET /expenses/summary` · `PATCH/DELETE /expenses/:id` |
| Reminders | `GET/POST /reminders` · `PATCH/DELETE /reminders/:id` · `POST /reminders/:id/complete` · `…/dismiss` · `…/reactivate` |
| Documents | `GET/POST /documents` · `GET/PATCH/DELETE /documents/:id` |
| Notifications | `GET /notifications` · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications[/:id]` |
| Insights | `GET /dashboard` · `GET /search?q=` |
| Exports | `GET /exports/service-records` · `/exports/expenses` · `/exports/maintenance` (`?format=csv\|pdf`) · `GET /exports/vehicles/:id/report` (PDF) |
| Admin | `GET /admin/analytics` · users CRUD + `PATCH /admin/users/:id/status` · `GET /admin/vehicles` · `GET /admin/maintenance` · `GET /admin/service-records` · CRUD for `/admin/templates`, `/admin/categories`, `/admin/vehicle-types`, `/admin/fuel-types` · `POST /admin/templates/:id/apply` |
| Health | `GET /health` |

List endpoints accept `page`, `limit`, `sort` (e.g. `-date`), `search`, and resource-specific filters (`vehicle`, `status`, `category`, `priority`, `from`/`to`, `dueFrom`/`dueTo`, …).

## Deployment

The recommended production setup is **Vercel** (frontend) + **Render** or **Railway** (API) + **MongoDB Atlas** + **Cloudinary**.

### 1. Database — MongoDB Atlas
Create the cluster as described in [Database setup](#database-setup), allowing `0.0.0.0/0` in Network Access. To load demo data, run `npm run seed` once from your machine with `MONGODB_URI` pointing at Atlas.

### 2. API — Render (or Railway)

**Render with the blueprint:** in Render, choose **New → Blueprint**, select the repo, and it reads [`render.yaml`](render.yaml). It generates the JWT secrets and prompts for the rest.

**Manual setup:**

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/api/health` |

| Environment variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Two different long random strings |
| `CLIENT_URL` | `https://your-app.vercel.app` (comma-separate extra domains) |
| `SERVER_URL` | `https://your-api.onrender.com` |
| `TRUST_PROXY` | `2` behind the Vercel rewrite (below), otherwise `1` |
| `CLOUDINARY_*` | **Recommended.** Render and Railway disks are ephemeral, so local uploads disappear on redeploy. |
| `SMTP_*`, `EMAIL_FROM` | Optional — for password-reset and alert emails |

**Railway** is the same: set the service root to `server`, use the same variables, and Railway provides `PORT` automatically.

### 3. Frontend — Vercel

1. Import the repo and set **Root Directory** to `client` (framework preset: Vite).
2. Edit [`client/vercel.json`](client/vercel.json) and replace `https://autocare360-api.onrender.com` with your API URL.
3. Deploy.

`vercel.json` does three things:
- Proxies `/api/*` and `/uploads/*` to the API, so the browser sees **one origin**. The refresh cookie is then first-party, which avoids third-party-cookie blocking in Safari and Chrome, and you need no `VITE_*` variables.
- Provides the SPA fallback, so deep links like `/app/vehicles/123` load correctly.
- Adds long-lived caching for hashed assets and baseline security headers.

<details>
<summary>Alternative: calling the API cross-origin (no rewrite)</summary>

Set `VITE_API_URL=https://your-api.onrender.com/api` (and `VITE_API_ORIGIN=https://your-api.onrender.com` if you don't use Cloudinary) in Vercel. Remove the two proxy rewrites from `vercel.json`. On the API, keep the production cookie defaults (`SameSite=None; Secure`), set `TRUST_PROXY=1`, and make sure `CLIENT_URL` exactly matches the Vercel origin. Some browsers block third-party cookies, which logs users out on refresh — this is why the rewrite setup is recommended.
</details>

### Production checklist
- [ ] Strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] `CLIENT_URL` matches the deployed frontend origin exactly (scheme + host, no trailing slash)
- [ ] Cloudinary configured
- [ ] SMTP configured (otherwise password-reset links only appear in the server logs)
- [ ] `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` set to your own values before seeding
- [ ] Demo account changed or removed if the deployment is public and writable

## Security

- Passwords hashed with **bcrypt** (12 rounds) and never returned by the API.
- A short-lived access token held **only in memory**, never in `localStorage`. Refresh tokens are httpOnly, `Secure` and `SameSite` cookies, stored **hashed**, **rotated** on every use, with **reuse detection**. Changing a password signs out other sessions.
- **Rate limiting** on the whole API, with stricter limits on login/register (25 per 15 min) and password reset (8 per hour).
- **Helmet** secure headers, a **CORS allow-list** with credentials, and a 1 MB JSON body limit.
- **Zod validation** on every write endpoint, plus **NoSQL-injection sanitization** of `$`/`.` keys.
- Every query is scoped by `owner`. Admin routes are gated by role, and blocked users are rejected on every request.
- Uploads: type and size checks, random file names, `nosniff`. CSV exports are escaped against formula injection.
- A central error handler returns clean messages and error codes only; stack traces stay in server logs.
- Secrets live only in environment variables: `.env` files are git-ignored and nothing secret is bundled into the client.

## Project structure

```
autocare360/
├── client/                  React + Vite SPA
│   ├── src/
│   │   ├── components/      ui/ (design system), charts/, layout/, domain components
│   │   ├── features/        forms and modals per domain
│   │   ├── hooks/           useFetch (cache + invalidation), useMotion, URL filters…
│   │   ├── layouts/         Public, Auth, App and Admin layouts
│   │   ├── pages/           public/, app/, admin/
│   │   ├── services/        axios instance (auto-refresh) + API modules
│   │   ├── store/           Redux Toolkit slices
│   │   └── utils/, validations/
│   ├── .env.example
│   └── vercel.json
├── server/                  Express API
│   ├── config/ constants/ controllers/ jobs/ middleware/
│   ├── models/ routes/ services/ utils/ validators/
│   ├── seed/                catalog, 187 templates, demo fleet
│   └── .env.example
├── ARCHITECTURE.md          design blueprint (schema, endpoints, pages)
├── render.yaml              Render blueprint for the API
└── package.json             workspace scripts
```

## Future improvements

- **Mobile app** (React Native / Expo) with push notifications and offline odometer logging.
- **OCR for receipts and invoices** to pre-fill service records and fuel logs.
- **Web push and WhatsApp / SMS reminders** alongside email.
- **Shared garages and fleets**: invite family members or drivers, with per-vehicle permissions and a fleet-manager role.
- **Workshop marketplace**: find nearby service centres, book appointments and receive digital job cards.
- **OBD-II / telematics integration** for automatic odometer and fault-code sync.
- **Predictive maintenance** using real driving patterns (usage-adjusted intervals, cost forecasting).
- **Multi-currency and unit localisation** (miles, gallons) and i18n.
- **Billing** (Stripe) for Pro and Fleet plans.
- **Automated testing**: Jest/Vitest unit tests for the maintenance engine, Supertest API tests and Playwright end-to-end tests in CI.
- **Observability**: structured logging, request tracing and error reporting (Sentry).
