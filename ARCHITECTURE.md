# AutoCare360 — Architecture

> Complete vehicle maintenance, simplified.

This document is the design blueprint that the implementation follows: **A.** project architecture, **B.** database schema, **C.** API endpoints, **D.** frontend pages, **E.** folder structure.

---

## A. Project architecture

```
┌──────────────────────────── client (Vercel) ────────────────────────────┐
│ React 19 + Vite + Tailwind v4                                           │
│  • React Router (public / app / admin route trees, lazy-loaded pages)   │
│  • Redux Toolkit: auth session, theme, catalog meta, notifications      │
│  • Axios instance: access token in memory, auto-refresh on 401          │
│  • Recharts, Framer Motion, React Hook Form + Zod, Lucide icons         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS  /api/*  (JSON, multipart)
┌───────────────────────────────▼──────────── server (Render / Railway) ──┐
│ Express 5                                                               │
│  helmet · cors · rate-limit · mongo-sanitize · cookie-parser · morgan   │
│  routes → validate (zod) → auth/authorize → controllers → services      │
│                                                                         │
│  Services (business logic, reusable, framework-free):                   │
│   maintenanceEngine   pure due-date/odometer/status/health maths        │
│   scheduleService     template matching, task generation, completion    │
│   serviceRecordSvc    records → complete tasks, expenses, odometer      │
│   reminderService     document/custom reminders, notification stages    │
│   dashboardService    aggregations for KPIs and charts                  │
│   storageService      Cloudinary or local-disk fallback                 │
│   emailService        Nodemailer (console fallback in development)      │
│   pdfService/export   PDF reports (pdfkit) and CSV exports              │
│  Jobs: node-cron — refresh task statuses + fire reminders every 30 min  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Mongoose
                        ┌───────▼────────┐        ┌──────────────┐
                        │ MongoDB Atlas  │        │  Cloudinary  │
                        └────────────────┘        └──────────────┘
```

### Key design decisions

| Concern | Decision |
| --- | --- |
| Vehicle-specific maintenance | A **template catalog** (`MaintenanceTemplate`) matched against a vehicle by *type code*, *type group*, *fuel type*, *powertrain*, *transmission*, *make* and *model*. Templates sharing a `code` override each other by specificity (model > make > fuel > type > group), so a manufacturer-specific interval replaces the generic one. EVs never match ICE-only templates. |
| Extensibility | Vehicle types, fuel types, categories and templates are **database rows managed in the admin panel**. A new vehicle type only needs a `group` (e.g. `two_wheeler`) to inherit every template of that group — no code changes. |
| Scheduling | Each `MaintenanceTask` is one **occurrence**. Completing or skipping an occurrence closes it and spawns the next one from the new baseline. History is therefore just closed occurrences. |
| Due logic | `nextDueDate = last + intervalMonths`, `nextDueOdometer = last + intervalKm`; status is the **worse of the two** (whichever comes first). Thresholds scale with the interval. |
| Usage units | Vehicle types declare `usageUnit` (`km` or `hours`) so tractors and construction equipment run on hour-meter intervals with the same engine. |
| Auth | Short-lived access JWT (memory) + rotating refresh JWT in an httpOnly cookie, hashed server-side with reuse detection. |
| Files | `storageService` uploads to Cloudinary when configured, otherwise to `server/uploads` (dev). |
| Status freshness | Task statuses are persisted (for fast filtering) and refreshed on odometer changes, service entries, on read (throttled per user) and by the cron job. |

---

## B. Database schema (Mongoose)

All collections have `timestamps` (`createdAt`, `updatedAt`). `owner` is always indexed and every user-facing query is scoped by it.

**User** — `name`, `email` (unique, lowercase), `password` (bcrypt, `select:false`), `role` (`user|admin`), `phone`, `avatar{url,publicId}`, `isActive` (block flag), `lastLoginAt`, `preferences{theme, currency, distanceUnit, reminderDaysBefore, emailNotifications}`, `refreshTokens[{tokenHash, expiresAt, userAgent}]`, `passwordResetToken`, `passwordResetExpires`, `passwordChangedAt`, `lastStatusSyncAt`.

**VehicleType** — `code` (unique), `name`, `group` (`passenger|two_wheeler|light_commercial|heavy_commercial|agricultural|construction|towable|other`), `illustration`, `usageUnit` (`km|hours`), `allowedFuelTypes[]`, `description`, `isActive`, `sortOrder`.

**FuelType** — `code` (unique), `name`, `powertrain` (`ice|hybrid|ev|fcev`), `isActive`, `sortOrder`.

**MaintenanceCategory** — `code` (unique), `name`, `description`, `icon`, `color`, `sortOrder`, `isActive`.

**MaintenanceTemplate** — `code` (override key), `name`, `description`, `category → MaintenanceCategory`, `vehicleTypes[]`, `vehicleGroups[]`, `fuelTypes[]`, `powertrains[]`, `transmissions[]`, `makes[]`, `excludeMakes[]`, `models[]`, `intervalKm`, `intervalMonths`, `priority` (`low|medium|high|critical`), `estimatedCost`, `estimatedDurationMinutes`, `serviceMode` (`diy|professional|either`), `notes`, `isRecurring`, `isActive`.

**Vehicle** — `owner → User`, `vehicleType` (code), `make`, `model`, `variant`, `year`, `registrationNumber` (unique per owner), `vin`, `engineNumber`, `fuelType`, `secondaryFuelType`, `transmission`, `purchaseDate`, `purchasePrice`, `purchaseOdometer`, `odometer`, `odometerUpdatedAt`, `odometerLogs[{value,date,source}]`, `color`, `nickname`, `image`, `notes`, `noteEntries[{title,body,pinned}]`, `status` (`active|sold|archived`), `lastServiceDate`, `lastServiceOdometer`, `healthScore`, `healthLabel`, `nextService{taskName,date,odometer,status}`.

**MaintenanceTask** — `owner`, `vehicle → Vehicle`, `template → MaintenanceTemplate`, `code`, `name`, `description`, `category → MaintenanceCategory`, `priority`, `serviceMode`, `isRecurring`, `isCustom`, `intervalKm`, `intervalMonths`, `estimatedCost`, `estimatedDurationMinutes`, `lastPerformedDate`, `lastPerformedOdometer`, `baselineEstimated`, `nextDueDate`, `nextDueOdometer`, `status` (`up_to_date|due_soon|due|overdue|completed|skipped`), `isOpen`, `dueBy`, `isRescheduled`, `completedAt`, `completedOdometer`, `actualCost`, `serviceRecord → ServiceRecord`, `skippedAt`, `skipReason`, `notes`, `lastNotifiedStatus`. Partial unique index: one open occurrence per `(vehicle, code)`.

**ServiceRecord** — `owner`, `vehicle`, `serviceDate`, `odometer`, `serviceCenter`, `serviceCenterLocation`, `mechanic`, `serviceType`, `maintenanceItems[{task, code, name, category}]`, `partsReplaced[{name, partNumber, quantity, unitPrice}]`, `laborCost`, `partsCost`, `taxes`, `discount`, `totalCost`, `rating`, `notes`, `invoice{file}`, `photos[{file}]`, `expense → Expense`.

**Expense** — `owner`, `vehicle`, `category` (fuel, charging, maintenance, repairs, insurance, registration, taxes, parking, toll, accessories, cleaning, tyres, parts, other), `amount`, `date`, `odometer`, `description`, `vendor`, `paymentMethod`, `fuelDetails{quantity, unit, pricePerUnit, fullTank}`, `serviceRecord → ServiceRecord`, `receipt{file}`, `notes`.

**Document** — `owner`, `vehicle` (optional — e.g. driving licence), `name`, `type`, `documentNumber`, `issuer`, `issueDate`, `expiryDate`, `uploadDate`, `file{url, publicId, originalName, mimeType, size}`, `notes`, `reminderDaysBefore`, `reminder → Reminder`.

**Reminder** — `owner`, `vehicle`, `type` (maintenance_due, maintenance_overdue, insurance_expiry, registration_expiry, pollution_expiry, warranty_expiry, license_expiry, document_expiry, custom), `title`, `description`, `dueDate`, `remindBeforeDays` (7/15/30/custom), `repeat` (`none|monthly|yearly`), `status` (`active|completed|dismissed`), `source` (`manual|document|maintenance`), `document → Document`, `task → MaintenanceTask`, `notifyByEmail`, `notifiedStages[]`, `lastNotifiedAt`.

**Notification** — `user`, `type`, `severity` (`info|success|warning|critical`), `title`, `message`, `link`, `read`, `readAt`, `vehicle`, `dedupeKey` (unique per user), TTL 120 days.

Relationships: `User 1─* Vehicle 1─* MaintenanceTask/ServiceRecord/Expense/Document/Reminder`; `ServiceRecord 1─1 Expense`; `ServiceRecord 1─* MaintenanceTask` (completed occurrences); `Document 1─1 Reminder`; `MaintenanceTask 1─1 Reminder` (auto maintenance reminders); `MaintenanceTemplate *─1 MaintenanceCategory`.

---

## C. API endpoints (`/api`)

Every response: `{ success, message?, data, meta? }`. Errors: `{ success:false, message, code, errors?[{field,message}] }`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `POST /auth/refresh` · `POST /auth/forgot-password` · `POST /auth/reset-password/:token` · `GET /auth/me` |
| Profile | `PATCH /users/me` · `PATCH /users/me/password` · `PATCH /users/me/preferences` · `POST /users/me/avatar` |
| Catalog | `GET /meta` (vehicle types, fuel types, categories) · `POST /maintenance/preview` (checklist preview for a vehicle spec) |
| Vehicles | `GET /vehicles` · `POST /vehicles` · `GET /vehicles/:id` · `PATCH /vehicles/:id` · `DELETE /vehicles/:id` · `GET /vehicles/:id/overview` · `PATCH /vehicles/:id/odometer` · `POST /vehicles/:id/image` · `POST /vehicles/:id/sync-schedule` · `POST/PATCH/DELETE /vehicles/:id/notes[/:noteId]` |
| Maintenance | `GET /maintenance` · `GET /maintenance/summary` · `POST /maintenance` · `GET /maintenance/:id` · `PATCH /maintenance/:id` · `POST /maintenance/:id/complete` · `POST /maintenance/:id/reschedule` · `POST /maintenance/:id/skip` · `DELETE /maintenance/:id` |
| Service records | `GET /service-records` · `POST /service-records` · `GET /service-records/:id` · `PATCH /service-records/:id` · `DELETE /service-records/:id` · `DELETE /service-records/:id/photos/:photoId` |
| Expenses | `GET /expenses` · `GET /expenses/summary` · `POST /expenses` · `PATCH /expenses/:id` · `DELETE /expenses/:id` |
| Reminders | `GET /reminders` · `POST /reminders` · `PATCH /reminders/:id` · `POST /reminders/:id/complete` · `POST /reminders/:id/dismiss` · `POST /reminders/:id/reactivate` · `DELETE /reminders/:id` |
| Documents | `GET /documents` · `POST /documents` · `GET /documents/:id` · `PATCH /documents/:id` · `DELETE /documents/:id` |
| Notifications | `GET /notifications` · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications/:id` · `DELETE /notifications` |
| Dashboard | `GET /dashboard` |
| Search | `GET /search?q=` |
| Export | `GET /exports/service-records` · `GET /exports/expenses` · `GET /exports/maintenance` (`?format=csv|pdf`) · `GET /exports/vehicles/:id/report` (PDF) |
| Admin | `GET /admin/analytics` · `GET/POST /admin/users` · `GET/PATCH/DELETE /admin/users/:id` · `PATCH /admin/users/:id/status` · `GET /admin/vehicles` · `GET /admin/maintenance` · `GET /admin/service-records` · `GET/POST/PATCH/DELETE /admin/categories` · `GET/POST/PATCH/DELETE /admin/templates` · `POST /admin/templates/:id/apply` · `GET/POST/PATCH/DELETE /admin/vehicle-types` · `GET/POST/PATCH/DELETE /admin/fuel-types` |

---

## D. Frontend pages

| Route | Page |
| --- | --- |
| `/` | Landing (hero, features, how it works, vehicle types, maintenance, expenses, reminders, analytics, testimonials, CTA, footer) |
| `/login` `/register` `/forgot-password` `/reset-password/:token` | Auth |
| `/app` | Dashboard — KPI cards, 6 charts, upcoming timeline, alerts, recent activity, fleet health |
| `/app/vehicles` | Vehicle grid/list with filters |
| `/app/vehicles/new` · `/app/vehicles/:id/edit` | Vehicle wizard with live maintenance-checklist preview |
| `/app/vehicles/:id` | Vehicle detail — Overview · Maintenance · Service History · Expenses · Documents · Reminders · Notes |
| `/app/vehicles/:id/report` | Printable maintenance report |
| `/app/maintenance` | Maintenance manager (filters, table/board, complete/reschedule/skip) |
| `/app/service-history` | Service records with attachments |
| `/app/expenses` | Expense tracker with analytics |
| `/app/reminders` | Reminders (upcoming, overdue, completed) |
| `/app/documents` | Document vault with expiry warnings |
| `/app/notifications` | Notification center |
| `/app/settings` | Profile, password, preferences, theme |
| `/admin` | Admin analytics |
| `/admin/users` `/admin/vehicles` `/admin/maintenance` | Admin data management |
| `/admin/templates` `/admin/categories` `/admin/vehicle-types` `/admin/fuel-types` | Catalog management |

Reusable components: `Sidebar`, `Header`, `MobileNav`, `DashboardCard`, `VehicleCard`, `MaintenanceCard`, `StatusBadge`, `Modal`, `ConfirmDialog`, `DataTable`, `Pagination`, `ChartCard`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `NotificationPanel`, `CommandPalette` (global search), `SearchBar`, `FilterDropdown`, `DatePicker`, `FileDropzone`, `HealthRing`, `Timeline`, `Tabs`, `VehicleArt`.

---

## E. Folder structure

```
autocare360/
├── client/                         React + Vite frontend
│   ├── public/
│   └── src/
│       ├── assets/                 static art
│       ├── components/
│       │   ├── ui/                 design-system primitives
│       │   ├── charts/             chart wrappers
│       │   ├── layout/             Sidebar, Header, MobileNav, NotificationPanel, CommandPalette
│       │   └── vehicles/ …         domain components
│       ├── features/               feature modules (forms, modals per domain)
│       ├── hooks/                  useFetch, useDebounce, useMediaQuery, …
│       ├── layouts/                PublicLayout, AuthLayout, AppLayout, AdminLayout
│       ├── pages/                  route pages (public, app, admin)
│       ├── services/               axios instance + API modules
│       ├── store/                  Redux Toolkit slices
│       ├── utils/                  formatters, constants, helpers
│       └── validations/            zod schemas
└── server/                         Express API
    ├── config/                     env, db, cloudinary
    ├── constants/                  enums
    ├── controllers/                thin HTTP handlers
    ├── jobs/                       cron scheduler
    ├── middleware/                 auth, validate, upload, errors, security
    ├── models/                     Mongoose models
    ├── routes/                     REST routes
    ├── seed/                       catalog + demo fleet seed
    ├── services/                   business logic
    ├── utils/                      helpers
    └── validators/                 zod request schemas
```
