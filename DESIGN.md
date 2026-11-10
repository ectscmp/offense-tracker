# Offense Tracker — Mobile Product Design

**Mobile-first behavior logging with QR student lookup**
Status: design + prototype + production vertical slice · October 2026

---

## 1. What we're building

A phone-first web app for teachers to log student behavior in under 10 seconds. The
teacher scans a student's existing ID barcode or a printed classroom QR label, lands
directly on that student's form, taps one or more behaviors, optionally adds a note,
and saves. Reports roll up by class and date range.

**Locked decisions**

| Decision | Choice |
|---|---|
| First deliverable | Clickable prototype + this design spec |
| QR source | Existing student ID barcodes **and** printable classroom QR labels |
| Student accounts | Roster only — students cannot view behavior records |
| Entry model | Multiple behaviors per entry, positive and concern |
| Platform | Installable PWA (native wrapper possible later) |

---

## 2. Product principles

1. **Speed beats completeness.** The teacher is standing, one-handed, mid-class.
   The common path must be scan → tap → save, with no class navigation.
2. **QR is an accelerator, never a gate.** Camera denied, damaged label, no card?
   Search and roster are always one tap away.
3. **Context is inferred, not asked for.** The active class follows the teacher;
   scanning a student from another class switches context automatically.
4. **Never punish the student with the UI.** Neutral language, positive behaviors,
   factual notes, and easy corrections. "Offense Tracker" is the working name;
   consider "Behavior Log" in the student-facing copy.
5. **Assume bad Wi-Fi.** Saves are optimistic and queue offline. Scanning degrades
   gracefully to search.
6. **One thumb, one hand.** Primary actions sit in the bottom third. Targets are
   ≥44px. Nothing important lives in the top corners.

---

## 3. The hero flow

> Teacher opens the installed app → **Scan** → scans student card → taps
> **Disrespect** → types a short note → **Save** — or **Save & scan next** to keep
> going.

```
Open app (1s)
   ↓
Tap center Scan button
   ↓
Camera already warm (rear camera, torch available)
   ↓
Scan student card / label          ← haptic + beep
   ↓
Form opens on that student, class inferred, time = now
   ↓
Tap 1–3 behavior chips
   ↓
Optional note (always visible)
   ↓
Save  ──────────────► Home + "Saved" toast with Undo (5s)
   └── Save & scan next ─► Camera reopens + "Saved" toast with Undo
```

Targets:

- **Median scan-to-save:** < 12 seconds.
- **Taps for a one-behavior entry:** 4 (scan, behavior, save, plus optional note).
- **Scan success rate:** > 95% on printed labels in normal classroom light.
- **Zero data loss:** every save is durable locally before the network is involved.

---

## 4. Information architecture

Five bottom-nav destinations, with Scan raised in the center:

```
┌──────────────────────────────────────────────┐
│  Home      Reports      ⬤ Scan      Roster   Settings │
└──────────────────────────────────────────────┘
```

- **Home** — greeting, active class, scan hero, today at a glance, recent students,
  latest entries.
- **Reports** — class + date range, overview/students/log tabs, CSV export.
- **Scan** — full-screen camera, torch, search fallback, roster, demo helpers.
- **Roster** — searchable class list, per-student history, print QR cards.
- **Settings** — behaviors, logging rules, QR cards, data, sign out.

**Class context** is a persistent chip in the header. It defaults to the class the
teacher most recently used. Later: infer the current period from the bell schedule.

**Deep links** (useful for PWA shortcuts and QR labels):

- `#/scan` — open camera
- `#/student/:id` — open that student's form
- `#/reports?range=7d` — report preset
- `#/roster` — class roster

---

## 5. Screen designs

### 5.1 Sign in — Microsoft

- Full-bleed school-branded screen, one primary button: **Continue with Microsoft**.
- Entra ID SSO; restrict to the school tenant or verified domains.
- No local passwords. Teachers only by default.
- First run: short permission primer for camera, phrased as "Used only to scan
  student cards. Nothing is recorded or uploaded."
- Failure states: wrong tenant ("Use your school account"), no teacher role,
  offline.

```
┌─────────────────────────────┐
│                             │
│           [ ◈ ]             │
│      Offense Tracker        │
│   Behavior logging, fast.   │
│                             │
│  ┌───────────────────────┐  │
│  │  Continue with Microsoft │
│  └───────────────────────┘  │
│                             │
│  Northside High School      │
│  Teachers only · Privacy    │
└─────────────────────────────┘
```

### 5.2 Home / Today

```
┌─────────────────────────────┐
│ Tue, Oct 26          [MR]   │
│ Good morning, Ms. Rivera    │
│                             │
│ CURRENT CLASS           ▾   │
│ Period 3 · Algebra II       │
│ Room 214 · 8 students       │
│                             │
│ ┌─────────────────────────┐ │
│ │ Scan a student      [▣] │ │
│ │ ID card or class QR     │ │
│ └─────────────────────────┘ │
│                             │
│ 4 entries · 3 students · 67%│
│ positive                    │
│                             │
│ Recent                      │
│ (MR)  (EC)  (AB)  (NP)  →   │
│                             │
│ Latest                      │
│ 10:42  Maya R.  Disrespect  │
│ 10:38  Ethan C. On task     │
│                             │
│ Home  Reports  ⬤  Roster  ⚙ │
└─────────────────────────────┘
```

- The scan hero is the largest target on the screen.
- The class card opens a bottom sheet; no separate settings maze.
- Recent students are derived from today's entries, deduped, most recent first.
  This is the no-card fast path.
- "Today" stats use the active class and local timezone.
- Latest entries tap through to the incident detail sheet (view/delete).

### 5.3 Class switcher

Bottom sheet listing the teacher's classes with period, name, room, student count,
and a check on the active class. Large rows. Changing class updates Home, Scan,
Roster, and the default report filter. Teachers can add a class from this sheet or
Settings. After creating a class, the roster page is the next step: add students
by name and ID, or enroll an existing student in an additional class by entering
their ID. CSV/Graph import and student join codes are later phases.

### 5.4 Scan

The most important screen. Camera fills the top ~55% of the viewport; fallbacks fill
the rest so they're visible without scrolling on a phone.

```
┌─────────────────────────────┐
│ ✕   P3 · Algebra II    🔦   │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │      ┌ ─ ─ ─ ─ ┐        │ │
│ │      │         │        │ │
│ │      │  scan   │        │ │
│ │      │         │        │ │
│ │      └ ─ ─ ─ ─ ┘        │ │
│ │  Point at a student ID  │ │
│ └─────────────────────────┘ │
│                             │
│ Can't scan? Search          │
│ [ Name or student ID     ]  │
│ (MR) Maya Rodriguez     ›   │
│ (EC) Ethan Chen         ›   │
│ (AB) Aaliyah Brooks     ›   │
│                             │
│ Start camera · Test a code  │
└─────────────────────────────┘
```

**Camera behavior**

- Rear camera, continuous autofocus, 10 fps, scan region ~68% of the short side.
- Torch toggle where the device supports it (important in dim rooms).
- Haptic pulse + short beep on decode; visual green edge flash.
- Ignore duplicate decodes of the same code for 3 seconds.
- **Save & scan next** returns here with a "Saved" toast and Undo, and ignores the
  previous student's code briefly so the teacher doesn't re-open it.
- On iOS Safari the scanner library is lazy-loaded only when Scan opens.
- Permission denied → friendly panel with "Open settings" instructions, plus
  search/roster. Never trap the teacher behind a permission wall.
- Offline → scan resolves from the cached roster map if available; otherwise
  explain and offer search (search also works offline once roster is cached).

**Resolution rules**

| Scan result | Behavior |
|---|---|
| Token maps to a student in the active class | Open the form immediately |
| Student is in exactly one other class you teach | Switch active class, toast the change, open form |
| Student is in multiple classes you teach | Bottom sheet: "Which class?" then open form |
| Student is not in any of your classes | Neutral error: "That student isn't in your classes." No name shown |
| Invalid / retired token | "Unrecognized code" + retry, torch hint, search |
| Duplicate scan < 3s | Ignored |
| Camera unavailable | Search/roster fallback is already on screen |

### 5.5 Student form

```
┌─────────────────────────────┐
│ ‹   Period 3 · Algebra II 🕘│
│           (MR)              │
│       Maya Rodriguez        │
│     10:42 AM · just now     │
│                             │
│ Positive                    │
│ [✅ On task ] [🤝 Helping ] │
│ [🙋 Participating         ] │
│                             │
│ Concern                     │
│ [🗯 Disrespect] [💭 Off-task]│
│ [📱 Phone use ] [🔊 Disruption]│
│ [⏰ Tardy     ] [🎒 Unprepared]│
│                             │
│ [ ＋ Other — describe below ]│
│                             │
│ Notes                Optional│
│ ┌─────────────────────────┐ │
│ │ Add context…            │ │
│ └─────────────────────────┘ │
│                             │
│ [  Save entry  ] [📷 Next ] │
└─────────────────────────────┘
```

- **Multi-select.** Positive and concern behaviors can coexist on one entry (e.g.,
  "Disruption" and "Disrespect" in the same incident). Selected chips get a tint,
  border, and check.
- **Other is always present**, system-locked in Settings, and cannot be deleted or
  hidden. It is neutral-toned, not automatically a concern.
- **Notes are always visible**, optional by default. Selecting Other requires a note
  by default so "Other" never becomes a meaningless category. The note field grows
  automatically; no modal.
- **Severity** (Low/Medium/High) is optional and off by default. Teachers who want
  it enable it in Settings; it appears as a compact chip row.
- **Time** defaults to now. Tap the clock to adjust (e.g., logging after the bell).
- **Save** is primary. **Save & scan next** is a full peer button, not a hidden
  overflow — it is the flow for hallways, lunch duty, and back-to-back incidents.
- On save: toast "Saved for Maya" with **Undo** for 5 seconds.
- Duplicate guard: if the same student + overlapping behavior was logged within
  2 minutes, show an inline warning with "Save anyway."
- Draft survives accidental navigation (session memory) and, in production,
  IndexedDB.

### 5.6 Roster

- Search by name or student ID.
- Rows show avatar/initials, name, last log, and 30-day count.
- Tap → form. This is the accessible, camera-free path.
- "Print QR cards" in the header opens the label sheet.
- Alphabetical by default; optional grouping by "recent" or "most logged" later.

### 5.7 Reports

```
┌─────────────────────────────┐
│ Reports            [Export] │
│ [P3 · Algebra II ▾]         │
│ [Today][7d][30d][Month][…]  │
│                             │
│ 12        5         67%     │
│ entries   students  positive│
│                             │
│ Entries over time           │
│ ▁▂▅▃▆▂▄▁                    │
│                             │
│ Behaviors                   │
│ Disrespect  ███████  7      │
│ Off-task    █████    5      │
│ On task     ████     4      │
│                             │
│ [Overview][Students][Log]   │
└─────────────────────────────┘
```

- **Date ranges:** Today, Last 7 days, Last 30 days, This month, Custom. Custom uses
  native date inputs (mobile-friendly) with an explicit Apply. Ranges are inclusive
  and interpreted in the school's timezone; timestamps are stored UTC.
- **Class filter:** defaults to the active class; includes "All classes" for a
  teacher-level view.
- **Overview:** entries, unique students, positive share, top behavior, daily trend,
  behavior breakdown, positive/concern split.
- **Students:** counts per student, top behavior, tap for a filtered history sheet.
- **Log:** reverse-chronological entries grouped by day; tap for detail/delete.
- **Export:** CSV for spreadsheets; PDF for conferences/administrators (phase 2).
- Mobile charts are CSS bars, not tiny SVG charts. No horizontal tables.

### 5.8 Settings

- **Behaviors**
  - Grouped Positive / Concern. Add, rename, reorder (later drag), toggle active,
    archive.
  - System **Other** row is locked on and labeled "Always available."
  - Each behavior: label, tone, emoji/icon, optional "requires note."
  - New behaviors appear immediately on the form and in reports.
- **Logging**
  - Show severity (off by default).
  - Require a note for Other (on by default).
  - Haptic/beep on scan (on by default).
  - Duplicate warning window.
- **Classroom & QR**
  - Print QR cards per class.
  - Rotate a student's code if a card is lost (phase 2).
  - Roster import / class join code (phase 1–2).
- **Data**
  - Export all (JSON/CSV), reset demo data, sign out, privacy policy.

### 5.9 QR cards / print sheet

- Preview shows a 2-column grid of cards: QR, student name, class, and a short
  human-readable fallback code.
- Print CSS outputs 2×6 labels per US Letter page (Avery 5160-compatible), with a
  quiet zone and no branding clutter.
- Each label is ~0.9" of QR at error correction M, scan-tested at 6–12 inches.
- Also offer a full-page roster sheet (30 labels) for the teacher's desk.
- Printing is client-side in the prototype; production generates a PDF server-side
  so it works on any device without a printer dialog surprise.

---

## 6. QR system deep dive

### 6.1 Two supported sources

**A. Existing student ID barcode (preferred when available)**

- District IDs typically carry Code 128, PDF417, or Data Matrix with the SIS ID.
- Scanner accepts multiple symbologies; the server maps `(school, externalId)` to a
  student.
- No new printing. But SIS IDs are often sequential/guessable, so authorization and
  rate limits are mandatory; never display a name for an unauthorized lookup.
- Confirm symbology and district permission before implementation.

**B. Printed classroom QR labels**

- Generate one opaque token per student at the school level.
- Print on Avery labels, desk tags, planner stickers, or interactive notebook covers.
- Best privacy: the code contains no name, ID, or behavior data.

Both paths resolve to the same internal `studentId`; the form is identical.

### 6.2 Payload

Production:

```
https://app.school.example/s/<token>
token = 128-bit random, base32, prefixed v1_
```

- **No PII** in the QR. No student name, SIS ID, school ID, or behavior data.
- HTTPS URL (not a custom scheme) so any camera app can open it and the PWA can
  capture it; authorization still gates the result.
- Tokens are stored hashed server-side, rotatable, and revocable.
- The `web/` app prints the same HTTPS `/s/<token>` link, built from `APP_URL`, the
  Auth.js origin, or the request host, so any phone camera opens the site. The legacy
  `ot://student/<id>` payload is still accepted, and is used only when no public origin
  can be determined (for example, printing from an unconfigured local build).

### 6.3 Lifecycle

- Created when a student is added to the school/roster.
- Stable across classes and years unless rotated.
- Rotate individually when a card is lost; bulk rotate at the start of a year.
- Revoke on withdrawal/transfer; old codes return a neutral "Unrecognized code."
- Lost/stolen card: rotate token, reprint label; no data is exposed by the code
  itself.

### 6.4 Where to put labels

| Placement | Best for | Notes |
|---|---|---|
| Existing ID badge | Everywhere | Zero printing; needs district buy-in |
| Desk tag | Elementary, fixed seating | Visible but not portable |
| Planner / agenda sticker | Middle/high school | Student carries it |
| Interactive notebook cover | Classroom routine | Durable, private |
| Folder label | Quick print | Cheap, replaceable |

Avoid wall-mounted name + QR sheets in public areas; that publishes a student's
association with the tool.

### 6.5 Edge cases

| Case | Handling |
|---|---|
| Damaged / dirty label | Manual search by name or ID; reprint |
| Two students, same name | Scan avoids ambiguity; search disambiguates with ID/photo |
| Student transferred class | Token still resolves; context follows the teacher's roster |
| Substitute teacher | Temporary class assignment by admin; same UI |
| Shared/kiosk iPad | Teacher PIN lock (phase 2); sign out reminder |
| Low light | Torch button + "Search instead" |
| Screen glare / cracked lens | Manual fallback |
| Offline | Cached token map; otherwise search with cached roster |
| Camera permission denied | Inline instructions + search; never blocking |
| Scanning a student from another school | Neutral "Unrecognized code" |
| Student scans their own card | No student view; login required, so nothing is exposed |

---

## 7. Form & behavior model

- **Categories:** Positive and Concern. Both are first-class; reports show the ratio.
- **Selection:** multi-select in one entry. Existing incidents store a snapshot of
  the behavior label/tone so renaming or deleting a behavior never rewrites history.
- **Other:** system behavior, always present, neutral tone, requires a note by
  default. It cannot be hidden or deleted.
- **Notes:** always rendered, never hidden behind a menu. Optional unless Other is
  selected or the behavior is configured to require one.
- **Severity:** optional; off by default to keep the common path fast.
- **Time:** now by default, editable; stored UTC, displayed in school local time.
- **Save & scan next:** the multi-student workflow. Shows a transient confirmation
  and returns to a warm camera.
- **Undo:** a 5-second toast; deletes the entry and restores stats.
- **Duplicate warning:** same student + behavior within 2 minutes.
- **Corrections:** entries can be viewed and deleted by the author; production adds
  edit with an audit trail and role-based retention rules.

---

## 8. Data model

```text
School        id, name, tenant_id, timezone, retention_days
User          id, school_id, entra_oid, email, display_name, role
Classroom     id, school_id, teacher_id, name, period, room, join_code, archived_at
Student       id, school_id, first_name, last_name, external_id, photo_url, status
Enrollment    id, classroom_id, student_id, active, joined_via, created_at
Behavior      id, school_id, owner_user_id, scope, label, tone, icon,
              sort_order, active, requires_note, system
Incident      id, school_id, classroom_id, student_id, teacher_id,
              occurred_at, note, severity, source, client_id, created_at,
              updated_at, deleted_at
IncidentBehavior  incident_id, behavior_id, label_snapshot, tone_snapshot
QrToken       id, school_id, student_id, token_hash, active, rotated_at
AuditEvent    id, school_id, actor_id, action, entity, entity_id, at, ip
```

Indexes:

- `incidents (school_id, classroom_id, occurred_at)`
- `incidents (school_id, student_id, occurred_at)`
- `incidents (client_id)` unique — idempotent offline sync
- `qr_tokens (token_hash)` unique
- `enrollments (classroom_id, student_id)` unique

Key constraints:

- A teacher can only read/write students enrolled in their classes (or admin scope).
- Incidents are soft-deleted; deletions are audited.
- Behavior snapshots preserve history.

---

## 9. API sketch

```text
POST   /api/auth/entra/callback
GET    /api/me
GET    /api/classrooms
POST   /api/classrooms
GET    /api/classrooms/:id/students
POST   /api/classrooms/:id/join-code/rotate
GET    /api/behaviors?classroomId=
POST   /api/behaviors
PATCH  /api/behaviors/:id
POST   /api/qr/resolve            { code } -> student | candidates | error
POST   /api/qr/cards              -> PDF or card payloads for a class
POST   /api/incidents             idempotency-key = clientId
GET    /api/incidents?classroomId&from&to&studentId&cursor
PATCH  /api/incidents/:id
DELETE /api/incidents/:id
GET    /api/reports/summary?classroomId&from&to
GET    /api/reports/export.csv?classroomId&from&to
```

`POST /api/qr/resolve` is server-side only. It enforces authorization and returns
only the minimal student fields needed by the form. Never expose a roster-wide token
map to an unauthenticated client.

---

## 10. Technical architecture (PWA)

**Recommended stack**

- **Next.js 16 App Router + TypeScript** — web app, route handlers, server actions.
- **Tailwind CSS + Radix primitives** — mobile UI, accessible dialogs/sheets.
- **MongoDB Atlas + official `mongodb` driver** — document data for rosters,
  entries, and reporting aggregations.
- **Auth.js v5 with Microsoft Entra ID** — SSO; tenant restriction.
- **Railway** — long-running Node service (required for the driver and camera HTTPS),
  simple env-var configuration, healthchecks.
- **Serwist** or equivalent — service worker, offline shell, install prompt.
- **TanStack Query + IndexedDB (Dexie/idb)** — cache + optimistic writes + sync queue.
- **ZXing (`@zxing/browser`) or native `BarcodeDetector`** — lazy-loaded scanner,
  with a fallback chain. `BarcodeDetector` is fast where supported; ZXing covers
  Safari and older devices.
- **qrcode + pdf-lib** — card sheet generation; print CSS in the prototype.

**PWA details**

- Manifest with `display: standalone`, theme color, 192/512 icons, maskable icon.
- App shortcuts: **Scan student**, **Reports**.
- Safe-area insets (`env(safe-area-inset-*)`), `100dvh`, 16px inputs to prevent iOS
  zoom.
- Scanner chunk is loaded on demand; the shell stays small.
- Install prompt after the second successful save, not on first launch.

**Why PWA first**

- Faster to ship and iterate; one codebase for iOS/Android.
- Camera scanning and offline queue are good enough for this workflow.
- If native-only constraints appear (background sync, Bluetooth, kiosk management),
  wrap with Capacitor rather than rewrite.

---

## 11. Offline & sync

- Every save is written to IndexedDB first with a client-generated UUID.
- UI is optimistic; a "Pending sync" chip appears only if the network is down.
- Sync on reconnect / app foreground / manual pull.
- `clientId` is the idempotency key — retries cannot duplicate entries.
- Cache: teacher profile, classes, roster, behaviors, QR token→student map (minimal
  fields, 24h TTL, cleared on sign out).
- Conflict policy: creates are idempotent; edits use `updated_at` with last-write-wins
  and an audit entry. v1 can restrict edits to online.
- Camera and scanning work fully offline against the cached map.
- Reports need a network connection; show cached summary if available, otherwise an
  empty state with "Reconnect to load reports."

---

## 12. Security, privacy & compliance

Behavior records are sensitive education records. Treat them accordingly.

- **FERPA** (US): limited access, audit trail, parent access process, retention and
  destruction policy. **COPPA** if any student account existed (we are not giving
  students accounts in v1). Check state-level student privacy laws.
- **Roles:** teacher (own classes), administrator (school), district admin (district),
  no student access. Least privilege by default.
- **Audit:** log views, creates, edits, deletes, exports, and QR reprints. Include
  actor, time, IP/device.
- **Retention:** configurable by district; default 1 school year + archive window.
  Soft delete, then purge.
- **Data minimization:** no SSN, no birthdate, no home address. Photos optional.
  Display name can be "First name + last initial" if the district prefers.
- **QR privacy:** opaque tokens only, no PII, revocable. Existing SIS barcodes are
  guessable; enforce authz + rate limits and never reveal names on failed resolution.
- **Transport/storage:** HTTPS/TLS, encryption at rest, encrypted backups, secrets
  in a managed vault, tenant-scoped queries/row-level security.
- **Camera:** frames are processed on-device; no images or video are uploaded.
- **Tone:** factual notes, neutral categories, positive behaviors visible, easy
  corrections. Avoid permanent labels and public displays of student behavior.
- **Vendor:** sign a DPA, document subprocessors, data residency, breach response.
- **Abuse:** rate-limit scan resolution and login; alert on enumeration patterns.

---

## 13. Accessibility & mobile design system

**Accessibility (WCAG 2.2 AA)**

- Touch targets ≥44×44px; chips/buttons ≥48px tall on the form.
- Contrast ≥4.5:1 for text, ≥3:1 for UI boundaries; never color-only status (icons +
  labels).
- Full screen-reader labels; behavior cards are toggle buttons with `aria-pressed`.
- Visible focus rings; logical focus order; sheets trap focus and close on Escape.
- Respect `prefers-reduced-motion`; no essential animation.
- Text zoom to 200% without loss of function; 16px minimum inputs.
- Camera is never the only path; search and roster are always available.
- Errors are announced in text near the field, not just a red border.

**Design tokens**

| Token | Light | Dark |
|---|---|---|
| Background | `#f4f6fa` | `#070b12` |
| Surface | `#ffffff` | `#0f1620` |
| Surface 2 | `#eef1f7` | `#151e2b` |
| Text | `#0f172a` | `#f1f5f9` |
| Muted | `#64748b` | `#94a3b8` |
| Border | `#e2e8f0` | `#243145` |
| Primary | `#4338ca` | `#818cf8` |
| Positive | `#047857` | `#34d399` |
| Concern | `#b91c1c` | `#f87171` |
| Warning | `#b45309` | `#fbbf24` |

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32.
- Radii: 12 (inputs), 16 (cards), 22 (sheets), 999 (chips).
- Type: system UI stack; body 16–17px, screen titles 24–28px, labels 12–13px.
- Layout baseline: 390×844 (iPhone 15), test at 375×667 (SE) and 412×915 (Pixel).
- Dark mode follows system; the scan screen is always dark for camera contrast.
- Bottom sheets instead of centered modals; sticky footers for primary actions.

---

## 14. Performance & device targets

- LCP < 2.5s on a mid-tier Android over school Wi-Fi/4G.
- Scanner chunk loaded only on the Scan screen; keep the initial bundle lean.
- Optimistic saves; no blocking spinners on the form.
- Virtualize rosters above ~200 students (district-wide admin views).
- Test matrix: iPhone SE (small, no notch), iPhone 15, Pixel 7/8, iPad (shared),
  low-light classroom, screen glare, cracked camera lens.
- Test ID symbologies with the actual district cards before promising support.

---

## 15. MVP scope & phases

**Phase 0 — Prototype validation (this)**

- Clickable mobile prototype with mock data.
- Test the scan → form → save → next loop with 3–5 teachers.
- Validate behavior list and report questions.

**Phase 1 — MVP**

- Microsoft Entra SSO, teacher role.
- Teacher-created classes + roster (CSV import and/or Graph EDU); join code optional.
- Behavior settings (positive/concern/Other, note rules, severity).
- Scan (existing ID + printed QR) with search/roster fallback; QR card PDF.
- Incident create with multi-select, notes, undo, duplicate guard.
- Reports: Today / 7 / 30 / month / custom, class filter, CSV export.
- PWA install + offline save queue.
- Audit log for create/delete/export.

**Phase 2**

- Admin/school dashboards, counselor view, PDF exports, student history PDF.
- QR token rotation UI, lost-card workflow.
- Roster sync via Microsoft Graph EDU; class join code with teacher approval.
- Edit entries with audit; retention controls.
- Parent/conference report packets.

**Phase 3**

- District analytics, PBIS points, positive-behavior campaigns.
- Parent portal (separate, opt-in, read-only).
- Native wrapper if needed; kiosk/hall-pass modes.

**Non-goals for v1**

- Student self-view, parent messaging, gradebook integration, AI summaries,
  discipline referrals, SIS write-back.

---

## 16. Metrics & pilot plan

**Product metrics**

- Median time from Scan tap to saved entry (target < 12s).
- % of entries created via scan vs search vs roster.
- Scan success rate and failure reasons.
- Entries per active teacher per week.
- Report opens per teacher per month.
- Sync failures / duplicate-prevention rate.
- Form abandonment (opened, no save).

**Pilot**

- 5 teachers across 2 schools, 3 weeks, iOS + Android mix.
- Daily 2-minute check-in: what slowed you down?
- Success gate: ≥ 80% of entries under 15 seconds and ≥ 90% scan success;
  otherwise fix the loop before adding features.
- Observe one live class per teacher (hallway/lunch scenarios included).

---

## 17. Open questions

1. **Existing ID symbology:** What is printed on district IDs (Code 128, PDF417,
   QR)? Do we have permission to use them?
2. **Microsoft tenant:** Is the district on Entra ID, and will they grant Graph
   `EduRoster.ReadBasic` or should v1 rely on CSV import?
3. **Behaviors:** Are any categories mandated by the district or building? Do we
   need a severity scale for legal/referral use?
4. **Roster source of truth:** teacher-managed CSV, SIS sync, or join code? Who
   approves student joins?
5. **Retention/access:** How long are records kept, and can teachers delete entries?
   Who can see them (counselors, admins, parents)?
6. **Naming/tone:** Keep "Offense Tracker" in UI, or use neutral "Behavior Log"?
7. **Device mix:** Are teachers on personal phones or school-issued iPads? Any
   kiosk/shared-device requirement?
8. **Offline:** Is offline saving mandatory in the first release (dead zones,
   lockdown drills)?
9. **Photos:** Show student photos on the form/roster, or initials only?
10. **Students joining:** Since students have no self-view, is a join code still
    needed for rosters, or is teacher import enough?

---

## 18. Prototype notes

The runnable prototype in `prototype/` implements:

- Mock Microsoft sign-in and 3 seeded classes with fictional students.
- Teacher-created classes (name, period, room) and roster additions by name and
  student ID; an existing student ID joins another class without duplicating the
  student.
- Bulk roster import with a live preview, per-line validation, duplicate skipping,
  and existing-student enrollment.
- Camera scanning (lazy-loaded `html5-qrcode`) plus demo QR/ID simulation, so the
  flow is testable without a camera or a printed label.
- Searchable scan fallback and roster, with class-context switching.
- Multi-select form with Positive / Concern / always-present Other, required note
  for Other, optional severity, save, Save & scan next, and Undo.
- Date-ranged reports with presets, custom dates, class filter, overview/students/
  log tabs, and CSV export.
- Settings for behaviors, note rules, severity, QR card preview/print, reset, and
  sign out.
- Persistent demo data in `localStorage`.

**Known prototype limits:** data is local-only (no server), camera requires HTTPS or
localhost, QR tokens are readable demo IDs rather than opaque production tokens,
and there is no real authentication. Basic class creation and roster additions are
interactive; CSV/Graph roster import, student self-service join codes, class
editing/deletion, PWA installation, and the offline queue are specified but not
interactive in this phase 0 prototype. See `README.md` for run instructions and QA
notes.

---

## 19. Production vertical slice (`web/`)

The first production slice is implemented in `web/` with Next.js 16, TypeScript,
Tailwind, Auth.js, server actions, and server-rendered pages.

Implemented:

- Auth.js v5 with Microsoft Entra ID wiring plus a development-only sign-in
- Teacher-scoped MongoDB repository behind a small data-access module
- Teacher-created classes, class editing, archive/restore, permanent deletion, class context,
  roster search, and behavior entry
- Roster editing, including student name/ID changes and removal from a class
- Camera scanning (ZXing) plus manual-code fallback, with cross-class resolution
- Opaque per-student QR tokens and a printable two-column QR card sheet
- Bulk roster import with preview, validation, transactions, duplicate skipping, and
  existing-student enrollment
- Dated reports (presets plus custom ranges) with class filtering and expandable
  behavior/student breakdowns
- Responsive app shell (mobile bottom navigation, desktop sidebar), settings/account, and sign out

Deliberate local-only choices:

- The production data layer uses MongoDB through the official Node driver. Connection
  settings come from `MONGODB_URI`/`MONGODB_DB`; indexes are created on first connect.
  Class membership is embedded on the student, and each incident embeds a behavior
  snapshot. A long-running Node host (Railway) is the deployment target.
- QR codes use a random, opaque `https://<origin>/s/<token>` link; scanning it with a
  phone camera opens the site and, after sign-in, the student's form. Existing student-ID
  barcodes and legacy `ot://student/<token>` payloads are still accepted by the scanner
  and manual fallback.
- Auth uses Microsoft Entra ID credentials read from the environment. Any account in the
  configured school tenant can sign in and create its own classes and rosters.
- Accounts start with no demo classes, roster, or entries.

Not yet in `web/`: behavior settings, CSV/PDF export, QR token
rotation, audit/retention, role management, PWA/offline.
These are the next slices, not completed production claims.
