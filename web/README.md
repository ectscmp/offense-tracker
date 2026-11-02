# Offense Tracker — production workspace

Next.js 16 app for the teacher behavior workflow.

## Status

First vertical slice. It is not ready for real student data.

Implemented:

- Auth.js (NextAuth v5) with Microsoft Entra ID provider and local development sign-in
- Server-rendered app shell and mobile bottom navigation
- Home dashboard with class context, today's stats, recent students, latest entries
- Teacher-created classes and class switching
- Class-scoped roster with search and student history
- Student behavior form with multi-select Positive / Concern / Other, notes, severity support,
  and server-side validation
- Camera scanning (ZXing) with manual code fallback and cross-class class switching
- Opaque QR tokens and a printable two-column QR card sheet
- Bulk roster import with client-side preview and server-side validation
- Reports for 7/30 days with behavior and student breakdowns
- Settings/account and sign out
- MongoDB persistence with seeded demo classes, roster, behaviors, and entries

Next slices: class editing/deletion, behavior settings, custom report ranges, CSV export,
QR token rotation, audit/retention, tenant-scoped access, PWA/offline.

## Requirements

- Node 24 or newer
- npm
- MongoDB (Atlas, or a local `mongod`)

## Run

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:check
npm run dev
```

Open **http://localhost:3000**.

Create `.env.local` from `.env.example` if it does not exist.

```powershell
Copy-Item .env.example .env.local
```

Microsoft Entra ID is the real sign-in path. For local UI work before the tenant is connected,
set `ENABLE_DEV_AUTH=true`; that button is explicitly development-only. Generate a fresh
`AUTH_SECRET` with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Microsoft Entra ID

Follow [`AUTH_SETUP.md`](AUTH_SETUP.md) to register the tenant app. Then add these to
`.env.local`:

```env
AUTH_MICROSOFT_ENTRA_ID_ID=<application-client-id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client-secret-value>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<directory-tenant-id>/v2.0/
ENABLE_DEV_AUTH=false
```

Register this redirect URI on the Entra app registration:

```text
http://localhost:3000/api/auth/callback/microsoft-entra-id
```

Verify the configuration, then restart:

```powershell
npm run auth:check
npm run dev
```

For deployed environments use the corresponding HTTPS origin. Keep the issuer on the district
tenant; do not leave the provider on `common` for a school deployment. The app checks the
token tenant and only accepts accounts with an email/UPN.

## Data

- Connection: `MONGODB_URI` and `MONGODB_DB` (default database name `offense_tracker`)
- Schema, indexes, and seed logic: `src/lib/db.ts`
- Collections: `teachers`, `classes`, `students`, `behaviors`, `incidents`, `settings`
- Indexes are created on the first connection; class membership is embedded in each student
  (`classIds`), and each incident embeds a snapshot of its behaviors.
- The teacher, demo classes, roster, and behaviors are created on the first sign-in.
- `SEED_DEMO=false` skips the fictional behavior entries (classes/behaviors still seed).

Check the connection and collection counts:

```powershell
npm run db:check
```

Drop the configured database (destructive; requires `--yes`):

```powershell
npm run db:reset -- --yes
```

The next sign-in re-seeds the demo teacher. Use a separate `MONGODB_DB` for tests so you do
not drop real data.

## Deploy to Railway

The service root directory should be `web`. Railway then reads
[`railway.json`](railway.json): Nixpacks install (`npm ci`), `npm run build`, `npm run start`,
and a healthcheck on `/api/health`. `.nvmrc` pins Node 24. If the root directory stays at the
repository root, the root `railway.json` delegates the same steps to `web/`.

Set these service variables:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=offense_tracker
AUTH_SECRET=<32-byte random base64 value>
AUTH_TRUST_HOST=true
AUTH_URL=https://<your-domain>.up.railway.app
ENABLE_DEV_AUTH=false
SEED_DEMO=false
AUTH_MICROSOFT_ENTRA_ID_ID=<application-client-id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client-secret-value>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<directory-tenant-id>/v2.0/
```

Add Railway's egress to the Atlas network access list, register the deployed callback URL
(`https://<your-domain>.up.railway.app/api/auth/callback/microsoft-entra-id`), and redeploy.
`/api/health` returns `{"ok":true,"database":"up"}` when the app can reach MongoDB, and `503`
when it cannot. Railway injects `PORT`; `next start` uses it automatically.

If the build picks a Node version older than 24, set `NIXPACKS_NODE_VERSION=24` as a service
variable.

## Checks

```powershell
npm run check
npm run lint
npm run auth:check
npm run db:check
npm run build
```

## Key routes

| Route | Purpose |
|---|---|
| `/login` | Microsoft / development sign-in |
| `/home` | Dashboard |
| `/scan` | Camera scanner, manual code lookup, and roster fallback |
| `/roster` | Class roster |
| `/roster/add` | Bulk/single-line roster import |
| `/roster/print` | Printable opaque QR cards |
| `/classes/new` | Create a class |
| `/student/[id]` | Behavior form and student history |
| `/reports` | 7/30-day class report |
| `/settings` | Account, classes, sign out |
| `/api/health` | Railway healthcheck; pings MongoDB |

## Security notes

- Every page and server action resolves the current teacher and scopes queries by teacher ID.
- Scanning accepts an opaque QR token or the student ID; both resolve only within the signed-in
  teacher’s roster.
- QR tokens are stored per student and are not displayed in normal student views.
- Bulk import validates all lines before writing and relies on a unique
  `(teacherId, externalIdLower)` index to avoid duplicate students.
- The development auth path must be disabled outside local development.
- QR tokens are opaque, but revocation/reprint controls still need to be added.
- Before a pilot: tenant-scoped access, tenant restriction, audit logging, retention,
  access review, rate limiting, backups, and a privacy review are still required.
