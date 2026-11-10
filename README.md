# Offense Tracker

**Mobile-first behavior logging with QR student lookup**

This repository contains a product design spec, a clickable phase 0 prototype, and the start of
the production app. The prototype validates the scan → tap → save loop. The `web/` workspace
turns that design into a real Next.js app with server-rendered pages, server actions,
MongoDB-backed persistence, bulk roster import, and Auth.js sign-in.

> **Not pilot-ready.** Both builds use fictional data. The production workspace has local
> development auth and a MongoDB data layer; it still needs the district Entra tenant, audit
> logging, tenant-scoped access, retention rules, and a security review before real student data
> is allowed.

---

## What's here

| File | Purpose |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Full product, UX, data, API, security, and delivery spec |
| [`web/`](web/) | **Production app** — Next.js 16, TypeScript, Tailwind, MongoDB, Auth.js |
| [`prototype/index.html`](prototype/index.html) | Runnable phase 0 prototype shell |
| [`prototype/app.js`](prototype/app.js) | Mock data, routing, scanner, form, reports, settings |
| [`prototype/styles.css`](prototype/styles.css) | Mobile design system, dark mode, print styles |
| [`server.js`](server.js) | Dependency-free Node static server for the prototype |
| [`package.json`](package.json) | Prototype server and checks |
| [`Notes.md`](Notes.md) | Original working notes and requirements |

The prototype has no build step. The production workspace needs Node 24+ and `npm install`.

---

## Production app (`web/`)

Requires Node 24+ and MongoDB (Atlas, or a local `mongod` on `mongodb://127.0.0.1:27017`).

```powershell
cd web
npm install
Copy-Item .env.example .env.local
# add AUTH_SECRET and MONGODB_URI to .env.local
npm run db:check
npm run dev
```

Open **http://localhost:3000**. From the repository root you can also run `npm run web`
(development) or `npm run web:build`.

In development, sign-in is skipped: the app automatically uses a local test account stored in
browser localStorage. Application data also uses a local JSON store, so dev does not connect to
MongoDB. Production builds cannot register that provider or use the local store. See
[`web/README.md`](web/README.md#development-sign-in).

What is implemented in this first production slice:

- Auth.js sign-in with Microsoft Entra ID wiring
- Server-rendered home dashboard with class context and live stats
- Teacher-created classes, class switching, class editing, archiving/restoring, and
  permanent deletion
- Class-scoped rosters with per-student editing and removal
- Student history and the core behavior entry form
- Camera scanning with ZXing, a manual code fallback, and cross-class resolution
- Opaque QR tokens and printable student QR cards
- Single-line and **bulk roster import** with preview, validation, duplicate detection, and
  enrolling an existing student in another class
- Reports for the last 7/30 days, this month, or a custom date range, with class
  filtering and expandable behavior/student breakdowns
- MongoDB persistence with behaviors and an empty roster/entry history by default
- Settings/account page and sign out

The first sign-in creates the teacher record and the default behavior vocabulary; accounts
start with no classes, students, or entries. `npm run db:reset -- --yes` drops the configured
database so the next sign-in recreates the defaults. `npm run db:check` prints the connection
status and collection counts.

Real Microsoft sign-in is wired through Auth.js and Microsoft Entra ID. It requires a tenant
app registration; any account in that tenant can sign in and create classes. Follow
[`web/AUTH_SETUP.md`](web/AUTH_SETUP.md). After adding the values, run:

```powershell
cd web
npm run auth:check
```

Register this callback URL on the Entra app registration:

```text
http://localhost:3000/api/auth/callback/microsoft-entra-id
```

See [`web/README.md`](web/README.md) for the app-specific notes and status.

### Deploy to Railway

`web/` is the deployable service; the repository root is only the static prototype. Railway
reads [`web/railway.json`](web/railway.json) when the service root directory is `web`.

1. Create a MongoDB Atlas cluster and database user. Add Railway's egress to Atlas Network
   Access. For a fictional-data pilot, `0.0.0.0/0` works; tighten it before real student data.
2. In Railway, create a project from this repository.
3. Open the service → **Settings → Source → Root Directory** → set it to `web`.
   Railway then installs with `npm ci`, runs `npm run build`, starts with `npm run start`, and
   healthchecks `/api/health`. `web/.nvmrc` pins Node 24. Leaving the root directory at the
   repository root also works: the root `railway.json` delegates the install, build, and start
   to `web/`.
4. Add these service variables:

   ```env
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=offense_tracker
   AUTH_SECRET=<32-byte random base64 value>
   AUTH_TRUST_HOST=true
   AUTH_URL=https://<your-domain>.up.railway.app
   AUTH_MICROSOFT_ENTRA_ID_ID=<application-client-id>
   AUTH_MICROSOFT_ENTRA_ID_SECRET=<client-secret-value>
   AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<directory-tenant-id>/v2.0
   ```

5. Generate a public domain under **Settings → Networking**, set `AUTH_URL` to it, and
   register `https://<your-domain>.up.railway.app/api/auth/callback/microsoft-entra-id` on the
   Entra app registration.
6. Deploy. `GET /api/health` returns `{"ok":true,"database":"up"}` when MongoDB is reachable.

Railway injects `PORT`, which `next start` honors. Keep `.env.local` out of git.

---

## Run the prototype (`prototype/`)

From this folder:

```powershell
node server.js
```

Or:

```powershell
npm start
```

Open **http://127.0.0.1:4173/**.

To use another port:

```powershell
$env:PORT=8080; node server.js
```

The Node server binds to `127.0.0.1` by default. Override it with `$env:HOST` if needed. Use
the local server rather than opening the HTML file directly; camera access and browser storage
behave consistently on localhost.

### Camera notes

- Camera scanning requires a **secure context**: `https://` or `localhost`. Opening the app
  from a LAN IP over plain HTTP will show the friendly fallback instead.
- The prototype works without a camera. On the Scan screen, use **Simulate QR**, **Simulate
  ID**, **Test states**, or the searchable roster.
- The scanner (`html5-qrcode`) and QR print generator (`qrcodejs`) load from jsDelivr. The
  demo controls and manual search work without those libraries, but camera and QR previews
  need an internet connection.
- On a phone, allow camera permission when prompted. Denying it is not a dead end: search and
  roster fallbacks stay available.

---

## Two-minute demo

1. Tap **Continue with Microsoft**. This is a mock sign-in.
2. On **Home**, tap the class card to switch between Period 3, Period 5, and Advisory.
   Choose **Add a class** to create a class, then add students from its empty roster.
3. Tap the large **Scan a student** card.
4. Tap **Simulate QR** (or **Test states → QR label**). The app opens the student's form.
5. Select one or more **Positive** and **Concern** behaviors.
6. Select **Other** and try to save without a note. The app asks for context. Add a note and
   save, or remove Other.
7. Optionally enable severity in Settings, change the entry time, and use **Save & scan** to
   log the next student.
8. Open **Reports**. Try 7 days, 30 days, a custom range, and **All classes**. Switch between
   Overview, Students, and Log. Export the CSV.
9. Open **Roster** to search, view a student's recent history, add a student, or print
   QR cards.
10. Open **Settings** to add/hide/delete behaviors, require a note, change logging rules, or
    reset the demo.

### Useful prototype states

- **Duplicate guard:** log the same student + behavior twice within two minutes. Choose
  **Save anyway** or wait.
- **Undo:** after saving or deleting an entry, use the Undo action in the toast.
- **Other validation:** the required-note rule is on by default and can be disabled in
  Settings.
- **Custom behavior note:** add a behavior and check **Require a note for this behavior**.
- **Scan edge cases:** on Scan, open **Test states** to try a student in two classes, a
  student outside the teacher's classes, and an unrecognized code.
- **Unknown deep link:** `#/student/s1` opens the form directly after sign-in.
- **Class setup:** open the class card or Settings → Classroom & QR → Add a class.
  After creating a class, add students from its roster. Adding an ID that already
  exists on another roster enrolls the same student in the new class.
- **Bulk roster:** Roster → Bulk add students. Paste `name, ID` lines or `first, last, ID`
  columns. Invalid lines block the import; existing IDs are skipped or enrolled.
- **Print:** Roster → Print QR cards → Print. The QR sheet is styled for 2-column label
  printing and multi-page output.

---

## What the prototype covers

- Mock Microsoft teacher sign-in and sign-out.
- Three seeded classes plus teacher-created classes (name, period, room), class switching,
  and class-aware reports.
- Roster additions by name and student ID, plus paste-a-list bulk import with preview,
  validation, duplicate skipping, and existing-student enrollment in another class.
- An existing student ID joins another class without creating a duplicate student.
- 21 seeded fictional students and local, persistent demo data.
- Camera scanning with torch support when the device exposes it, duplicate decode
  suppression, search/roster fallback, and demo scan outcomes.
- Printable classroom QR cards that encode an absolute app link, so any phone camera opens the
  student form after sign-in (`ot://student/<id>` is still accepted by the scanner).
- Student form with multi-select Positive/Concern behaviors, an always-present system
  **Other** behavior, optional notes, configurable required notes, optional severity,
  editable time, duplicate warning, Save, Save & scan next, and Undo.
- Student history sheet with all-entry counts and the 10 most recent entries.
- Reports with Today / 7 / 30 / This month / Custom ranges, class or All classes filtering,
  overview charts, student aggregation, log detail, entry deletion, and CSV export.
- Searchable roster with 30-day counts and QR printing.
- Behavior settings (add, hide, delete, require note), logging preferences, haptics,
  duplicate warnings, reset, and sign out.
- Persistent demo state in `localStorage` key `offense-tracker-demo-v1`.
- Responsive layout tested from 320 px through desktop, light/dark color schemes, and print.
- CSV export guards against spreadsheet formula injection.

---

## Data and privacy

- Seed names and entries are fictional.
- The scanner processes frames on the device; the prototype does not upload video or entries.
- The only network requests are the app's static assets and the two CDN libraries.
- **Reset demo data** in Settings restores the seeded state. To clear it manually, remove the
  `offense-tracker-demo-v1` key from browser storage.
- Production privacy, FERPA/COPPA considerations, retention, audit logging, tenant
  restrictions, and role-based access are covered in [`DESIGN.md`](DESIGN.md) §12.

---

## QA performed

The prototype and production app were exercised with Playwright 1.50 driving Microsoft Edge.

Production app:

- Development sign-in, class creation, class context, home dashboard, student form, save
  entry, reports, settings, and sign out.
- Bulk import of a new student, an existing student from another class, and a duplicate in
  the same class; validation prevents a partially invalid import.
- Camera startup with a fake media device, external-ID lookup, opaque QR-token lookup, and
  cross-class scan switching.
- Printable QR cards: seven cards render and produce one Letter page without a blank trailing
  page.
- Layout at 390×844, 375×667, 320×568, and 1280×800 with no horizontal overflow; fixed save
  bar and bottom navigation remain usable.
- `next build`, TypeScript, and ESLint pass with no console or page errors in the final run.

Prototype:

- Sign-in, class creation, adding students, existing-student enrollment in a second class,
  class switching, scan/search, all demo scan outcomes, and unknown/unauthorized students.
- Form validation for Other and custom required-note behaviors, multi-select, severity,
  time editing, duplicate warning, Save anyway, Undo, entry deletion/restore, and student
  history beyond 10 entries.
- Reports presets, custom ranges, All classes, tabs, CSV download and formula guarding.
- Behavior add/hide/delete, settings toggles, reset, sign-out/sign-in, and deep links.
- Layout at 390×844, 375×667, 320×568, and 1280×800: no horizontal overflow, save bar and
  tab bar remain usable.
- QR printing with 32 cards produced four Letter pages after the print-style fix.
- No page errors or console errors in the final runs.

A physical-device camera and printer pass is still recommended; automated tests cannot replace
those.

---

## Prototype limitations

These are intentional for the phase 0 prototype and are specified as production work in
`DESIGN.md`:

- **No real backend or authentication.** Microsoft sign-in is simulated; data is local to the
  browser. Use the production workspace for server-side persistence.
- **Class/roster setup is basic.** You can create a class and add students by ID, but there is
  no class editing/deleting, CSV/Graph import, student self-service join, or join-code UI.
  Those flows are described in the spec and API.
- **Not an installable PWA yet.** There is no manifest, service worker, or offline save queue.
- **Demo QR tokens are readable student IDs.** Production labels should use opaque, revocable
  tokens.
- **No real access control or audit log.** Everyone with the browser profile can see the demo
  data.
- **No student photos.** Initials only; showing photos is an open product question.
- **No SIS/Graph integration, report PDFs, admin/counselor views, or retention controls.**
- **Camera and QR rendering depend on third-party CDNs.** Production should bundle and pin
  dependencies.
- **No formal accessibility audit.** Basic labels and reduced-motion handling are present, but
  sheet focus trapping and a screen-reader pass remain.
- **CSV only.** PDF report packets are phase 2.

### Production build status

The `web/` app is a first vertical slice, not a finished release.

- **MongoDB is wired, but not hardened.** The repository interface is isolated in
  `web/src/lib/db.ts`; indexes are created on connect. Tenant-scoped repositories, backup and
  restore drills, and access review are still required.
- **Behavior settings are not in the production UI yet.** Class creation/editing, archiving,
  deletion, roster import, scanning, and the first logging flow are implemented.
- **QR tokens are opaque but not revocable from the UI yet.** Plan token rotation/reprint
  controls before a pilot.
- **Reports need CSV export and print.** Reports support preset and custom dates.
- **No audit log, retention policy, role management, or tenant restriction.** Add these
  before any pilot involving real students.
- **Entra ID is wired but not configured.** Follow [`web/AUTH_SETUP.md`](web/AUTH_SETUP.md) and
  run `npm run auth:check`.
- **No PWA manifest, service worker, or offline queue in the production app yet.**

---

## Open product questions

These decisions should be answered before phase 1. The full list is in
[`DESIGN.md`](DESIGN.md) §17.

1. What symbology is on district student IDs (Code 128, PDF417, QR), and may the app use them?
2. Is the district on Microsoft Entra ID, and will it grant Graph EDU roster access, or should
   v1 rely on CSV import?
3. Are behavior categories or a severity scale mandated by the district or building?
4. Should rosters be teacher-managed CSV, SIS/Graph synced, or joined by students with a class
   code and teacher approval?
5. How long are records retained, who can see them, and can teachers delete entries?
6. Should the UI keep the name **Offense Tracker** or use neutral **Behavior Log** copy?
7. Are teachers using personal phones or school-issued iPads? Any shared-device/kiosk need?
8. Is offline saving mandatory in the first release?
9. Should rosters and forms show student photos or initials only?
10. Since students cannot view their records, is a student join code needed at all?

---

## Suggested next steps

1. Answer the product questions above, especially roster source, ID symbology, and naming.
2. Run the two-minute prototype demo with 3–5 teachers and time the scan → save loop.
3. Configure the district Entra tenant, point `MONGODB_URI` at the pilot cluster, and add
   tenant-scoped repositories plus audit logging.
4. Finish the production slices: class editing, behavior settings, custom date reports and
   CSV, token rotation, audit log, and offline support.
5. Test the camera scanner against real student IDs and printers on school devices.
