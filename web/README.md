# Offense Tracker — production workspace

Next.js 16 app for the teacher behavior workflow.

## Status

First vertical slice. It is not ready for real student data.

Implemented:

- Auth.js (NextAuth v5) with Microsoft Entra ID provider
- Server-rendered app shell and mobile bottom navigation
- Home dashboard with class context, today's stats, recent students, latest entries
- Teacher-created classes, class switching, editing, archiving/restoring, and permanent deletion
- Class-scoped roster with search, per-student editing, removal, and student history
- Student behavior form with multi-select Positive / Concern / Other, notes, severity support,
  and server-side validation
- Camera scanning (ZXing) with manual code fallback and cross-class class switching
- Opaque QR tokens and a printable two-column QR card sheet
- Bulk roster import with client-side preview and server-side validation
- Reports for 7/30 days with behavior and student breakdowns
- Settings/account and sign out
- MongoDB persistence with default behaviors and empty rosters/entries

Next slices: behavior settings, custom report ranges, CSV export, QR token rotation,
audit/retention, tenant-scoped access, PWA/offline.

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

Microsoft Entra ID is the sign-in path for deployed builds. `npm run dev` also has a
development-only local account, described below. Generate a fresh `AUTH_SECRET` with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Development sign-in

Running `npm run dev` skips the Microsoft flow. The login page automatically signs in a local
test account and stores it in the browser under the localStorage key
`offense-tracker.dev-account.v1`.

- Sign out to return to the login page, then choose **Continue as local test account** to sign
  back in.
- The provider is registered only when `NODE_ENV === "development"`. `next build` and
  `next start` always run with `NODE_ENV=production`, so the local account cannot exist in a
  deployed build. A dev-issued session is also rejected at the session callback if it is ever
  presented to production.
- The account writes to the development JSON store (see below), not MongoDB.
- Use a separate `MONGODB_DB` if you opt back into Mongo with `DEV_STORE=mongo`.

## Development data store

`npm run dev` does not connect to MongoDB. The same data-access functions in `src/lib/store.ts`
switch to a local JSON store at `web/.data/dev-db.json`, so the app, server actions, and
reports all work with no database running.

- The file is created on the first dev sign-in and seeds the default behavior vocabulary and
  settings. It starts with no classes, students, or entries.
- Reset it with `npm run dev:db:reset`, then restart the dev server so the in-memory cache is
  cleared. You can also delete `web/.data/dev-db.json`.
- Set `DEV_STORE=mongo` in `.env.local` to use MongoDB while developing (for example, to test a
  migration against real data).
- Production always uses MongoDB. The local store also refuses to run outside development.
- `npm run db:check` and `npm run db:reset` still target MongoDB; they are not used by the dev
  data path.

## Microsoft Entra ID

Follow [`AUTH_SETUP.md`](AUTH_SETUP.md) to register the tenant app. Then add these to
`.env.local`:

```env
AUTH_MICROSOFT_ENTRA_ID_ID=<application-client-id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client-secret-value>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<directory-tenant-id>/v2.0
```

Any account in the configured school tenant can sign in and create classes. No app role,
security group, or email allowlist is required.

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

- `src/lib/store.ts` chooses the backend: a local JSON store during development and MongoDB in
  production. Pages and server actions import from `@/lib/store`, so responses are identical.
- Development store: `src/lib/db-local.ts` writes to `web/.data/dev-db.json`.
- Production store: `src/lib/db.ts` uses `MONGODB_URI` and `MONGODB_DB` (default database name
  `offense_tracker`).
- Collections: `teachers`, `classes`, `students`, `behaviors`, `incidents`, `settings`
- Indexes are created on the first connection; class membership is embedded in each student
  (`classIds`), each incident embeds a snapshot of its behaviors, and classes use
  `archivedAt` for archive/restore.
- The teacher, default behaviors, and settings are created on the first sign-in.
  New accounts start with an empty workspace.

Check the Mongo connection and collection counts (not used by the dev data path):

```powershell
npm run db:check
```

Drop the configured Mongo database (destructive; requires `--yes`):

```powershell
npm run db:reset -- --yes
```

Reset the local development store:

```powershell
npm run dev:db:reset
```

The next sign-in recreates the teacher defaults. Use a separate `MONGODB_DB` for tests so you do
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
# Optional. QR cards otherwise reuse AUTH_URL or the request host.
APP_URL=https://<your-domain>.up.railway.app
AUTH_MICROSOFT_ENTRA_ID_ID=<application-client-id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client-secret-value>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<directory-tenant-id>/v2.0
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
| `/login` | Microsoft sign-in |
| `/home` | Dashboard |
| `/scan` | Camera scanner, manual code lookup, and roster fallback |
| `/roster` | Class roster |
| `/roster/add` | Bulk/single-line roster import |
| `/roster/print` | Printable opaque QR cards |
| `/s/[token]` | Short QR link; opens the student after sign-in |
| `/classes/new` | Create a class |
| `/classes/[id]/edit` | Edit, archive, or delete a class |
| `/student/[id]` | Behavior form and student history |
| `/student/[id]/edit` | Edit a roster entry or remove it from the class |
| `/reports` | 7/30-day class report |
| `/settings` | Account, classes, sign out |
| `/api/health` | Railway healthcheck; pings MongoDB |

## Security headers and rate limiting

- `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) applies a per-IP
  fixed-window rate limit. General requests default to 300 per minute; `/api/auth/*`
  defaults to 60 per five minutes. `/api/health` and Link prefetches are exempt.
- Override the defaults with `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`,
  `AUTH_RATE_LIMIT_MAX`, and `AUTH_RATE_LIMIT_WINDOW_MS`.
- Counters are in memory, reset on restart, and are not shared between app
  instances. Use Redis/Upstash before scaling past one instance.
- `src/lib/security-headers.ts` defines the CSP, HSTS, frame, referrer, MIME
  sniffing, cross-origin, and permissions headers. `next.config.ts` applies them
  to every response; `proxy.ts` also attaches them to 429 responses.
- The CSP allows inline scripts and styles because the App Router emits inline
  bootstrap scripts. Tightening it to nonces would require every page to be
  dynamically rendered.

## Security notes

- Every page and server action resolves the current teacher and scopes queries by teacher ID.
- Scanning accepts an opaque QR token, the student ID, or a printed `/s/<token>` link; all
  resolve only within the signed-in teacher’s roster.
- Printed QR codes contain an HTTPS link to `/s/<token>` (`APP_URL`, `AUTH_URL`, or the request
  host, in that order) so a phone camera opens the site instead of showing a custom-scheme code.
- QR tokens are stored per student and are not displayed in normal student views.
- Bulk import validates all lines before writing and relies on a unique
  `(teacherId, externalIdLower)` index to avoid duplicate students.
- The development auth path is gated on `NODE_ENV === "development"` and is never registered in
  a production build.
- QR tokens are opaque, but revocation/reprint controls still need to be added.
- Rate limiting is in-memory and per instance; move it to a shared store before running
  multiple instances.
- Before a pilot: tenant-scoped access, tenant restriction, audit logging, retention,
  access review, backups, and a privacy review are still required.
