(() => {
  'use strict';

  const LS_KEY = 'offense-tracker-demo-v1';
  const SCANNER_SRC = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  const QRCODE_SRC = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  const TAB_ROUTES = ['home', 'reports', 'roster', 'settings'];

  const app = document.getElementById('app');
  const sheetRoot = document.getElementById('sheet-root');
  const toastRoot = document.getElementById('toast-root');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  let uidCounter = 0;
  const uid = () => `${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const parseLocalDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDate = (d, opts) => new Date(d).toLocaleDateString('en-US', opts);
  const fmtShort = (d) => fmtDate(d, { month: 'short', day: 'numeric' });
  const fmtDayLabel = (d) => {
    const date = new Date(d);
    if (sameDay(date, new Date())) return 'Today';
    if (sameDay(date, addDays(new Date(), -1))) return 'Yesterday';
    return fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const initials = (s) => `${(s.first || '?')[0]}${(s.last || '')[0] || ''}`.toUpperCase();
  const nameOf = (s) => `${s.first} ${s.last}`;
  const getClass = (id) => state.classes.find((c) => c.id === id);
  const getStudent = (id) => state.students.find((s) => s.id === id);
  const studentsInClass = (classId) => state.students.filter((s) => s.classIds.includes(classId));
  const studentQrUrl = (student) => {
    const url = new URL(location.href);
    url.search = '';
    url.hash = `#/student/${encodeURIComponent(student.id)}`;
    return url.href;
  };
  const classLabel = (c) => c ? `${c.period} · ${c.name}` : 'Class';
  const classShort = (c) => c ? `${c.period.replace('Period ', 'P')} · ${c.name}` : 'Class';
  const sortedIncidents = () => [...state.incidents].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const avatarHTML = (s, cls = '') => `<span class="avatar ${cls}" style="--avatar:${s.color};--avatar-soft:${s.color}22">${esc(initials(s))}</span>`;

  const defaultSettings = { showSeverity: false, requireOtherNote: true, haptics: true, warnDuplicates: true };
  const defaultUi = { reportTab: 'overview', reportPreset: '7d', reportClassId: 'c1', reportStart: '', reportEnd: '' };
  const STUDENT_COLORS = ['#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
  const CLASS_COLORS = ['#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function seedState() {
    const classes = [
      { id: 'c1', period: 'Period 3', name: 'Algebra II', room: '214', color: '#6366f1' },
      { id: 'c2', period: 'Period 5', name: 'Algebra II', room: '214', color: '#0ea5e9' },
      { id: 'c3', period: 'Period 7', name: 'Advisory', room: '214', color: '#10b981' }
    ];
    const roster = [
      ['s1', 'Maya', 'Rodriguez', ['c1', 'c3'], '100100001'],
      ['s2', 'Ethan', 'Chen', ['c1'], '100100002'],
      ['s3', 'Aaliyah', 'Brooks', ['c1'], '100100003'],
      ['s4', 'Noah', 'Patel', ['c1', 'c3'], '100100004'],
      ['s5', 'Sofia', 'Martinez', ['c1'], '100100005'],
      ['s6', "Liam", "O'Connor", ['c1'], '100100006'],
      ['s7', 'Zoe', 'Kim', ['c1'], '100100007'],
      ['s8', 'Malik', 'Johnson', ['c1'], '100100008'],
      ['s9', 'Emma', 'Wilson', ['c2', 'c3'], '100100009'],
      ['s10', 'Diego', 'Alvarez', ['c2'], '100100010'],
      ['s11', 'Priya', 'Nair', ['c2'], '100100011'],
      ['s12', 'Jack', 'Thompson', ['c2'], '100100012'],
      ['s13', 'Nora', 'Hassan', ['c2'], '100100013'],
      ['s14', 'Tyler', 'Nguyen', ['c2'], '100100014'],
      ['s15', 'Ava', 'Washington', ['c2'], '100100015'],
      ['s16', 'Caleb', 'Foster', ['c3'], '100100016'],
      ['s17', 'Isabella', 'Rossi', ['c3'], '100100017'],
      ['s18', 'Hannah', 'Park', ['c3'], '100100018'],
      ['s19', 'Omar', 'Haddad', ['c3'], '100100019'],
      ['s20', 'Grace', 'Liu', ['c3'], '100100020'],
      ['s21', 'Riley', 'Cooper', [], '100100021']
    ];
    const students = roster.map(([id, first, last, classIds, externalId], i) => ({
      id, first, last, classIds, externalId, color: STUDENT_COLORS[i % STUDENT_COLORS.length]
    }));
    const behaviors = [
      { id: 'on_task', label: 'On task', tone: 'positive', icon: '✅', active: true },
      { id: 'helping', label: 'Helping others', tone: 'positive', icon: '🤝', active: true },
      { id: 'participating', label: 'Participating', tone: 'positive', icon: '🙋', active: true },
      { id: 'disrespect', label: 'Disrespect', tone: 'concern', icon: '🗯️', active: true },
      { id: 'off_task', label: 'Off-task', tone: 'concern', icon: '💭', active: true },
      { id: 'phone', label: 'Phone use', tone: 'concern', icon: '📱', active: true },
      { id: 'disruption', label: 'Disruption', tone: 'concern', icon: '🔊', active: true },
      { id: 'tardy', label: 'Tardy', tone: 'concern', icon: '⏰', active: true },
      { id: 'unprepared', label: 'Unprepared', tone: 'concern', icon: '🎒', active: true },
      { id: 'other', label: 'Other', tone: 'neutral', icon: '＋', active: true, system: true }
    ];
    return {
      version: 1,
      auth: false,
      teacher: { name: 'Ms. Rivera', first: 'Ms. Rivera', initials: 'MR', email: 'rivera@northside.edu', school: 'Northside High School' },
      classes,
      students,
      behaviors,
      incidents: seedIncidents(classes, students, behaviors),
      selectedClassId: 'c1',
      settings: { ...defaultSettings },
      ui: { ...defaultUi }
    };
  }

  function seedIncidents(classes, students, behaviors) {
    const rand = mulberry32(20261026);
    const positives = behaviors.filter((b) => b.tone === 'positive');
    const concerns = behaviors.filter((b) => b.tone === 'concern');
    const notePool = [
      'Redirected quietly; student reset and rejoined the task.',
      'Second reminder needed before the behavior stopped.',
      'Spoke with the student after class.',
      'Parent contact already documented for this week.',
      'Positive note sent home.',
      'Phone was out during independent practice.',
      'Left seat without permission; returned after a reminder.',
      'Helped a classmate without being asked.',
      'Partial work submitted; follow-up planned.',
      'Incident happened during the transition.'
    ];
    const list = [];
    for (let dayOffset = 20; dayOffset >= 0; dayOffset--) {
      const day = addDays(new Date(), -dayOffset);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      const count = dayOffset === 0 ? 4 : Math.floor(rand() * 4);
      for (let i = 0; i < count; i++) {
        const roll = rand();
        const cls = roll < 0.55 ? classes[0] : roll < 0.85 ? classes[1] : classes[2];
        const roster = students.filter((s) => s.classIds.includes(cls.id));
        const student = roster[Math.floor(rand() * roster.length)];
        const positive = rand() < 0.3;
        const picked = [];
        if (positive) {
          picked.push(positives[Math.floor(rand() * positives.length)]);
          if (rand() < 0.18) picked.push(positives[Math.floor(rand() * positives.length)]);
        } else {
          picked.push(concerns[Math.floor(rand() * concerns.length)]);
          if (rand() < 0.24) {
            const extra = concerns[Math.floor(rand() * concerns.length)];
            if (!picked.includes(extra)) picked.push(extra);
          }
        }
        const when = new Date(day);
        when.setHours(8 + Math.floor(rand() * 7), Math.floor(rand() * 60), 0, 0);
        if (dayOffset === 0) {
          const now = new Date();
          if (when > now) when.setTime(now.getTime() - (7 + i * 19) * 60000);
          if (when < startOfDay(now)) when.setTime(now.getTime() - 12 * 60000);
        }
        list.push({
          id: `seed_${dayOffset}_${i}`,
          studentId: student.id,
          classId: cls.id,
          teacherId: 't1',
          behaviors: picked.map((b) => ({ id: b.id, label: b.label, tone: b.tone, icon: b.icon })),
          note: rand() < 0.38 ? notePool[Math.floor(rand() * notePool.length)] : '',
          severity: rand() < 0.22 ? (rand() < 0.55 ? 'low' : 'medium') : null,
          occurredAt: when.toISOString(),
          createdAt: when.toISOString(),
          source: rand() < 0.6 ? 'scan' : rand() < 0.6 ? 'search' : 'roster'
        });
      }
    }
    return list;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.classes) || !Array.isArray(data.students)) return null;
      data.settings = { ...defaultSettings, ...(data.settings || {}) };
      data.ui = { ...defaultUi, ...(data.ui || {}) };
      if (!data.ui.reportClassId) data.ui.reportClassId = data.selectedClassId || 'c1';
      return data;
    } catch {
      return null;
    }
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  }

  let state = loadState() || seedState();
  let draft = null;
  let autoStart = false;
  let scanner = null;
  let scannerToken = 0;
  let cameraGranted = false;
  let torchOn = false;
  let lastScanText = '';
  let lastScanAt = 0;

  const NEXT_KEY = 'offense-tracker-next';
  function rememberNext(hash) {
    try { sessionStorage.setItem(NEXT_KEY, hash); } catch { /* private mode */ }
  }
  function takeNext() {
    try {
      const hash = sessionStorage.getItem(NEXT_KEY);
      sessionStorage.removeItem(NEXT_KEY);
      return hash || '';
    } catch { return ''; }
  }

  function parseRoute() {
    const raw = (location.hash || '#/login').replace(/^#/, '');
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    return { name: parts[0] || 'home', id: parts[1], query: new URLSearchParams(query || '') };
  }
  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function render() {
    stopScanner();
    const route = parseRoute();
    if (!state.auth && route.name !== 'login') {
      if (location.hash) rememberNext(location.hash);
      history.replaceState(null, '', '#/login');
      return render();
    }
    if (state.auth && route.name === 'login') {
      history.replaceState(null, '', '#/home');
      return render();
    }
    if (route.name === 'student') ensureDraft(route.id);

    const views = {
      login: viewLogin, home: viewHome, scan: viewScan, student: viewStudent,
      reports: viewReports, roster: viewRoster, settings: viewSettings
    };
    const view = views[route.name] || viewHome;
    app.innerHTML = view(route);
    if (TAB_ROUTES.includes(route.name)) app.insertAdjacentHTML('beforeend', viewTabbar(route.name));
    document.title = route.name === 'home' ? 'Offense Tracker' : `${route.name[0].toUpperCase()}${route.name.slice(1)} · Offense Tracker`;
    afterRender(route);
    window.scrollTo(0, 0);
  }

  function afterRender(route) {
    if (route.name !== 'scan') return;
    if (autoStart || cameraGranted) {
      autoStart = false;
      setTimeout(() => startScanner(), 180);
    }
  }

  function viewTabbar(active) {
    const tabs = [
      ['#/home', 'home', 'Home'],
      ['#/reports', 'chart', 'Reports'],
      ['#/scan', 'scan', 'Scan'],
      ['#/roster', 'users', 'Roster'],
      ['#/settings', 'settings', 'Settings']
    ];
    return `<nav class="tabbar" aria-label="Primary">${tabs.map(([href, ico, label]) => {
      if (ico === 'scan') {
        return `<a href="${href}" class="tab scan-tab ${active === 'scan' ? 'active' : ''}"><span class="scan-fab">${icon('scan')}</span><span class="tab-label">${label}</span></a>`;
      }
      return `<a href="${href}" class="tab ${active === href.slice(2) ? 'active' : ''}">${icon(ico)}<span>${label}</span></a>`;
    }).join('')}</nav>`;
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function viewLogin() {
    return `<div class="login">
      <div class="login-top">
        <div class="brand-mark">${icon('scan')}</div>
        <div><div class="login-brand">Offense Tracker</div><div class="login-school">${esc(state.teacher.school)}</div></div>
      </div>
      <div class="login-hero">
        <h1>Behavior logging,<br>without the clipboard.</h1>
        <p>Scan a student, tap what happened, and get back to teaching.</p>
        <div class="login-features">
          <span>${icon('qr')} QR + ID scan</span>
          <span>${icon('clock')} Works offline</span>
          <span>${icon('chart')} Date-range reports</span>
        </div>
      </div>
      <div class="login-actions">
        <button class="ms-btn" data-action="login"><span class="ms-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span> Continue with Microsoft</button>
        <p class="login-note">Teachers only · Single sign-on with your school account</p>
        <p class="demo-note">Design prototype · Use the button above for the mock sign-in</p>
      </div>
    </div>`;
  }

  function viewHome() {
    const cls = getClass(state.selectedClassId) || state.classes[0];
    const roster = studentsInClass(cls.id);
    const pending = sortedIncidents();
    const today = pending.filter((i) => i.classId === cls.id && sameDay(new Date(i.occurredAt), new Date()));
    const todayStudents = new Set(today.map((i) => i.studentId));
    const instances = today.flatMap((i) => i.behaviors);
    const pos = instances.filter((b) => b.tone === 'positive').length;
    const con = instances.filter((b) => b.tone === 'concern').length;
    const share = pos + con ? Math.round((pos / (pos + con)) * 100) : null;
    const recent = [];
    const seen = new Set();
    for (const incident of pending) {
      if (incident.classId !== cls.id || seen.has(incident.studentId)) continue;
      seen.add(incident.studentId);
      recent.push({ student: getStudent(incident.studentId), count: today.filter((i) => i.studentId === incident.studentId).length });
      if (recent.length >= 5) break;
    }
    const latest = pending.filter((i) => i.classId === cls.id).slice(0, 3);

    return `<div class="view">
      <header class="home-head">
        <div>
          <p class="eyebrow">${esc(fmtDate(new Date(), { weekday: 'short', month: 'short', day: 'numeric' }))}</p>
          <h1>${greeting()},<br>${esc(state.teacher.name)}</h1>
        </div>
        <a href="#/settings" aria-label="Settings">${avatarHTML({ first: 'Ms', last: 'R', color: '#6366f1' })}</a>
      </header>

      <button class="class-card" data-action="open-class-sheet">
        <span class="class-dot" style="background:${cls.color}"></span>
        <span class="class-copy">
          <span class="eyebrow">Current class</span>
          <strong>${esc(classLabel(cls))}</strong>
          <small>Room ${esc(cls.room)} · ${roster.length} students</small>
        </span>
        ${icon('chevron')}
      </button>

      <button class="scan-hero" data-action="nav" data-href="#/scan">
        <span class="hero-copy">
          <span class="hero-eyebrow">Fastest way to log</span>
          <h2>Scan a student</h2>
          <p>ID card or classroom QR</p>
        </span>
        <span class="hero-icon">${icon('qr')}</span>
      </button>

      <div class="today-card">
        <div class="today-head">
          <span>Today · ${esc(cls.period)}</span>
          <button data-action="open-class-sheet">Switch ${icon('chevron')}</button>
        </div>
        <div class="today-stats">
          <div class="today-stat"><strong>${today.length}</strong><span>entries</span></div>
          <div class="today-stat"><strong>${todayStudents.size}</strong><span>students</span></div>
          <div class="today-stat"><strong class="${share !== null && share >= 50 ? 'pos' : ''}">${share === null ? '—' : share + '%'}</strong><span>positive</span></div>
        </div>
      </div>

      <section class="section">
        <div class="section-head"><h2>Recent students</h2><a href="#/roster">Full roster</a></div>
        ${recent.length ? `<div class="recent-row">${recent.map(({ student, count }) => `
          <button class="recent-person" data-action="open-student" data-id="${student.id}" data-class="${cls.id}" data-source="recent" data-back="#/home">
            ${avatarHTML(student)}
            <span class="name">${esc(student.first)}</span>
            <span class="count">${count ? count + ' today' : 'no logs'}</span>
          </button>`).join('')}</div>` : `<div class="empty">${icon('users')}<strong>No entries yet today</strong><p>Scan a card or open the roster to start.</p></div>`}
      </section>

      <section class="section">
        <div class="section-head"><h2>Latest</h2><a href="#/reports">View reports</a></div>
        ${latest.length ? latest.map((incident) => {
          const s = getStudent(incident.studentId);
          if (!s) return '';
          return `<button class="mini-log" data-action="open-incident" data-id="${incident.id}">
            <span class="mini-time">${esc(fmtTime(incident.occurredAt))}</span>
            ${avatarHTML(s, 'sm')}
            <span class="mini-main"><span class="mini-name">${esc(nameOf(s))}</span><span class="mini-behaviors">${esc(incident.behaviors.map((b) => b.label).join(' · '))}</span></span>
            ${icon('chevron')}
          </button>`;
        }).join('') : `<div class="empty">${icon('spark')}<strong>Nothing logged yet</strong><p>Your latest entries will show up here.</p></div>`}
      </section>
    </div>`;
  }

  function openClassSheet() {
    const active = state.selectedClassId;
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Class context</p><h2>Switch class</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">Scanning a student from another class switches context automatically.</p>
      <div class="sheet-list">${state.classes.map((c) => `
        <button class="sheet-row" data-action="pick-class" data-id="${c.id}">
          <span class="class-dot" style="background:${c.color}"></span>
          <span class="grow"><strong>${esc(classLabel(c))}</strong><small>Room ${esc(c.room)} · ${studentsInClass(c.id).length} students</small></span>
          ${c.id === active ? '<span class="chip">Current</span>' : icon('chevron')}
        </button>`).join('')}</div>
      <button class="sheet-row" data-action="add-class">
        <span class="row-icon">${icon('plus', 'sm')}</span>
        <span class="grow"><strong>Add a class</strong><small>Create a class and start a roster</small></span>
        ${icon('chevron')}
      </button>
    `);
  }

  function toast(message, opts = {}) {
    const el = document.createElement('div');
    el.className = 'toast';
    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);
    let timer;
    if (opts.action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opts.action;
      btn.addEventListener('click', () => {
        clearTimeout(timer);
        el.remove();
        if (opts.onAction) opts.onAction();
      });
      el.appendChild(btn);
    }
    toastRoot.appendChild(el);
    timer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .18s ease';
      setTimeout(() => el.remove(), 200);
    }, opts.duration || 5000);
  }

  function openSheet(html, extraClass = '') {
    sheetRoot.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div><div class="sheet ${extraClass}">${html}</div>`;
    const sheet = $('.sheet', sheetRoot);
    if (sheet) { sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('tabindex', '-1'); }
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => {
      sheetRoot.classList.add('open');
      if (sheet) sheet.focus({ preventScroll: true });
    });
  }
  function closeSheet() {
    if (!sheetRoot.innerHTML) return;
    sheetRoot.classList.remove('open');
    document.body.classList.remove('sheet-open');
    const snapshot = sheetRoot;
    setTimeout(() => {
      if (!snapshot.classList.contains('open')) snapshot.innerHTML = '';
    }, 200);
  }
  const isSheetOpen = () => sheetRoot.classList.contains('open');

  /* ------------------------------ Scan ------------------------------ */

  function viewScan() {
    const cls = getClass(state.selectedClassId) || state.classes[0];
    const roster = studentsInClass(cls.id).sort((a, b) => a.first.localeCompare(b.first));
    return `<div class="scan-page">
      <div class="camera-shell" id="camera-shell">
        <div id="reader"></div>
        <div class="scan-overlay" aria-hidden="true">
          <div class="scan-frame"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><span class="scan-line"></span></div>
          <p class="scan-status" id="scan-status">Scanning — hold steady</p>
        </div>
        <div class="scan-placeholder" id="scan-placeholder">
          <div class="scan-illustration">${icon('qr', 'xl')}</div>
          <h2>Scan a student</h2>
          <p>Point the camera at an ID barcode or a printed classroom QR label.</p>
          <button class="btn light" data-action="start-scan">${icon('camera')} Start camera</button>
          <p class="tiny" id="scan-note">Camera stays on this device. Nothing is uploaded.</p>
        </div>
        <header class="scan-topbar">
          <button class="icon-btn glass" data-action="nav" data-href="#/home" aria-label="Back">${icon('back')}</button>
          <button class="context-pill glass" data-action="open-class-sheet">${esc(classShort(cls))} ${icon('chevron')}</button>
          <button class="icon-btn glass torch-btn" data-action="torch" aria-label="Toggle torch">${icon('torch')}</button>
        </header>
      </div>
      <div class="scan-panel">
        <div class="scan-panel-head">
          <div><p class="eyebrow">Can’t scan?</p><h2>Find the student</h2></div>
          <button class="link-btn" data-action="show-demo-sheet">Test states</button>
        </div>
        <div class="search-field">
          ${icon('search')}
          <input id="student-search" data-filter="scan-roster" type="search" inputmode="search" autocomplete="off" placeholder="Name or student ID" aria-label="Search students">
        </div>
        <div class="demo-row">
          <span class="demo-label">Demo</span>
          <button class="demo-chip" data-action="simulate-scan" data-mode="qr">Simulate QR</button>
          <button class="demo-chip" data-action="simulate-scan" data-mode="id">Simulate ID</button>
        </div>
        <div class="roster-list" id="scan-roster">
          ${roster.map((s) => scanRosterRow(s, cls)).join('')}
          <p class="list-empty" id="list-empty" hidden>No students match that search.</p>
        </div>
      </div>
    </div>`;
  }

  function scanRosterRow(s, cls) {
    const search = `${s.first} ${s.last} ${s.externalId}`.toLowerCase();
    return `<button class="roster-row" data-action="open-student" data-id="${s.id}" data-class="${cls.id}" data-source="search" data-back="#/scan" data-search="${esc(search)}">
      ${avatarHTML(s)}
      <span class="roster-main"><strong>${esc(nameOf(s))}</strong><small>ID ${esc(s.externalId)}</small></span>
      ${icon('chevron')}
    </button>`;
  }

  const scriptCache = new Map();
  function loadScript(src) {
    if (scriptCache.has(src)) return scriptCache.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { scriptCache.delete(src); reject(new Error('Could not load scanner.')); };
      document.head.appendChild(script);
    });
    scriptCache.set(src, promise);
    return promise;
  }

  async function startScanner() {
    if (parseRoute().name !== 'scan') return;
    const reader = document.getElementById('reader');
    if (!reader) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      scanCameraError('This browser does not support camera scanning. Use search or a demo button.');
      return;
    }
    if (!window.isSecureContext) {
      scanCameraError('Camera needs HTTPS or localhost. Use search or a demo button here.');
      return;
    }
    const myToken = ++scannerToken;
    const note = document.getElementById('scan-note');
    if (note) note.textContent = 'Starting camera…';
    try {
      await loadScript(SCANNER_SRC);
      if (myToken !== scannerToken || !document.getElementById('reader')) return;
      if (!window.Html5Qrcode) throw new Error('Scanner unavailable');
      const instance = new window.Html5Qrcode('reader', {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      });
      scanner = instance;
      await instance.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1.0,
          qrbox: (w, h) => { const size = Math.floor(Math.min(w, h) * 0.68); return { width: size, height: size }; }
        },
        (text) => { if (!isSheetOpen()) handleScanText(text); },
        () => {}
      );
      if (myToken !== scannerToken) {
        try { await instance.stop(); } catch { /* noop */ }
        try { instance.clear(); } catch { /* noop */ }
        return;
      }
      cameraGranted = true;
      document.getElementById('camera-shell')?.classList.add('live');
      const placeholder = document.getElementById('scan-placeholder');
      if (placeholder) placeholder.hidden = true;
      const status = document.getElementById('scan-status');
      if (status) status.textContent = 'Scanning — hold steady';
    } catch (err) {
      if (myToken !== scannerToken) return;
      scanner = null;
      scanCameraError(cameraErrorMessage(err));
    }
  }

  function cameraErrorMessage(err) {
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked. Allow it in browser settings, or search below.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No rear camera found. Use search or a demo button.';
    if (name === 'NotReadableError') return 'The camera is busy in another app. Close it and try again.';
    return 'Could not start the camera. Use search or a demo button.';
  }

  function scanCameraError(message) {
    cameraGranted = false;
    const placeholder = document.getElementById('scan-placeholder');
    const note = document.getElementById('scan-note');
    const status = document.getElementById('scan-status');
    document.getElementById('camera-shell')?.classList.remove('live');
    if (placeholder) placeholder.hidden = false;
    if (note) note.textContent = message;
    if (status) status.textContent = message;
  }

  function stopScanner() {
    scannerToken++;
    const instance = scanner;
    scanner = null;
    if (!instance) return;
    try {
      Promise.resolve(instance.stop()).catch(() => {}).finally(() => { try { instance.clear(); } catch { /* noop */ } });
    } catch {
      try { instance.clear(); } catch { /* noop */ }
    }
  }

  async function toggleTorch(btn) {
    if (!scanner) { toast('Start the camera first'); return; }
    try {
      const caps = scanner.getRunningTrackCapabilities ? scanner.getRunningTrackCapabilities() : {};
      if (!caps || !caps.torch) { toast('Torch isn’t available on this device'); return; }
      torchOn = !torchOn;
      await scanner.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
      if (btn) btn.classList.toggle('active', torchOn);
    } catch {
      toast('Could not toggle the torch');
    }
  }

  function parseScan(text) {
    let id = String(text || '').trim();
    const match = id.match(/ot:\/\/student\/([A-Za-z0-9_-]+)/i)
      || id.match(/\/s\/([A-Za-z0-9_-]+)/i)
      || id.match(/#\/student\/([A-Za-z0-9_-]+)/i)
      || id.match(/[?&](?:code|student)=([A-Za-z0-9_-]+)/i);
    if (match) id = match[1];
    try { id = decodeURIComponent(id); } catch { /* noop */ }
    const student = state.students.find((s) => s.id === id) || state.students.find((s) => s.externalId === id);
    return student ? { student } : {};
  }

  function setScanStatus(message) {
    const status = document.getElementById('scan-status');
    if (status) status.textContent = message;
  }

  function handleScanText(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    const now = Date.now();
    if (clean === lastScanText && now - lastScanAt < 3000) return;
    lastScanText = clean;
    lastScanAt = now;

    const { student } = parseScan(clean);
    if (!student) {
      scanFeedback(false);
      setScanStatus('No match — try again or search below');
      toast('Unrecognized code');
      return;
    }
    const authClasses = student.classIds.map(getClass).filter(Boolean);
    if (!authClasses.length) {
      scanFeedback(false);
      setScanStatus('Not in your classes');
      toast('That student isn’t in your classes.');
      return;
    }
    if (authClasses.some((c) => c.id === state.selectedClassId)) {
      successScan(student, state.selectedClassId);
      return;
    }
    if (authClasses.length === 1) {
      state.selectedClassId = authClasses[0].id;
      state.ui.reportClassId = authClasses[0].id;
      saveState();
      toast(`Switched to ${classShort(authClasses[0])}`);
      successScan(student, authClasses[0].id);
      return;
    }
    scanFeedback(true);
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Multiple classes</p><h2>Which class?</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">${esc(student.first)} is enrolled in more than one of your classes.</p>
      <div class="sheet-list">${authClasses.map((c) => `
        <button class="sheet-row" data-action="pick-scan-class" data-id="${c.id}" data-student="${student.id}">
          <span class="class-dot" style="background:${c.color}"></span>
          <span class="grow"><strong>${esc(classLabel(c))}</strong><small>Room ${esc(c.room)} · ${studentsInClass(c.id).length} students</small></span>
          ${icon('chevron')}
        </button>`).join('')}</div>
    `);
  }

  function successScan(student, classId) {
    scanFeedback(true);
    stopScanner();
    openStudent(student.id, 'scan', classId);
  }

  function handleDemoScan(mode) {
    closeSheet();
    const cls = getClass(state.selectedClassId) || state.classes[0];
    const roster = studentsInClass(cls.id);
    const pick = roster[Math.floor(Math.random() * roster.length)];
    if (mode === 'qr' && pick) handleScanText(studentQrUrl(pick));
    else if (mode === 'id' && pick) handleScanText(pick.externalId);
    else if (mode === 'multi') {
      const student = getStudent('s9');
      if (student.classIds.includes(state.selectedClassId)) {
        state.selectedClassId = 'c1';
        saveState();
      }
      handleScanText(studentQrUrl(student));
    } else if (mode === 'unauthorized') handleScanText(studentQrUrl({ id: 's21' }));
    else if (mode === 'unknown') handleScanText(studentQrUrl({ id: 'not_a_real_student' }));
  }

  function openDemoSheet() {
    const states = [
      ['qr', 'QR label', 'Simulates a printed classroom QR label.'],
      ['id', 'Existing ID barcode', 'Simulates a district student ID number.'],
      ['multi', 'Student in two classes', 'Shows the “Which class?” chooser.'],
      ['unauthorized', 'Not in your classes', 'Shows the neutral privacy-safe error.'],
      ['unknown', 'Unrecognized code', 'Shows the retry state.']
    ];
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Prototype helpers</p><h2>Test scan outcomes</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">These buttons exercise the same resolution logic as the camera, without needing a printed label.</p>
      <div class="sheet-list">${states.map(([mode, label, sub]) => `
        <button class="sheet-row" data-action="simulate-scan" data-mode="${mode}">
          <span class="row-icon">${icon('scan', 'sm')}</span>
          <span class="grow"><strong>${label}</strong><small>${sub}</small></span>
          ${icon('chevron')}
        </button>`).join('')}</div>
    `);
  }

  let audioCtx = null;
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 920;
      gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch { /* noop */ }
  }

  function scanFeedback(ok) {
    if (state.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(ok ? 25 : [35, 40, 35]); } catch { /* noop */ }
    }
    if (ok) beep();
  }

  /* ------------------------------ Student form ------------------------------ */

  function ensureDraft(studentId) {
    const student = getStudent(studentId);
    if (!student) { draft = null; return; }
    if (draft && draft.studentId === studentId) return;
    const auth = student.classIds.filter((id) => getClass(id));
    const classId = auth.includes(state.selectedClassId) ? state.selectedClassId : (auth[0] || state.selectedClassId);
    draft = { studentId, classId, behaviorIds: [], note: '', severity: null, occurredAt: new Date().toISOString(), source: 'search', back: '#/home' };
  }

  function openStudent(studentId, source = 'search', classId, back) {
    const student = getStudent(studentId);
    if (!student) { toast('Student not found'); return; }
    const auth = student.classIds.filter((id) => getClass(id));
    const chosen = classId && auth.includes(classId)
      ? classId
      : auth.includes(state.selectedClassId) ? state.selectedClassId : auth[0];
    if (!chosen) { toast('That student isn’t in your classes.'); return; }
    state.selectedClassId = chosen;
    state.ui.reportClassId = chosen;
    saveState();
    draft = { studentId, classId: chosen, behaviorIds: [], note: '', severity: null, occurredAt: new Date().toISOString(), source, back: back || (source === 'scan' ? '#/scan' : '#/home') };
    navigate(`#/student/${studentId}`);
  }

  function behaviorCard(b) {
    const selected = draft.behaviorIds.includes(b.id);
    return `<button type="button" class="behavior-card tone-${b.tone} ${selected ? 'selected' : ''}" data-action="select-behavior" data-id="${esc(b.id)}" aria-pressed="${selected}">
      <span class="b-icon" aria-hidden="true">${esc(b.icon)}</span>
      <span class="b-label">${esc(b.label)}</span>
      <span class="b-check">${icon('check')}</span>
    </button>`;
  }

  function behaviorRequiresNote(id) {
    const behavior = state.behaviors.find((b) => b.id === id);
    return !!(behavior && (behavior.requiresNote || (behavior.system && state.settings.requireOtherNote)));
  }

  function fmtEntryWhen(value) {
    const date = new Date(value);
    if (sameDay(date, new Date())) return `Today, ${fmtTime(date)}`;
    return `${fmtDayLabel(date)}, ${fmtTime(date)}`;
  }

  function viewStudent() {
    if (!draft) {
      return `<div class="view no-tabbar"><header class="page-head"><button class="icon-btn" data-action="nav" data-href="#/home" aria-label="Home">${icon('back')}</button></header><div class="empty">${icon('user')}<strong>Student not found</strong><p>Go back and pick a student from the roster.</p></div></div>`;
    }
    const student = getStudent(draft.studentId);
    const cls = getClass(draft.classId);
    if (!student || !cls) {
      return `<div class="view no-tabbar"><header class="page-head"><button class="icon-btn" data-action="nav" data-href="#/home" aria-label="Home">${icon('back')}</button></header><div class="empty">${icon('user')}<strong>Student not found</strong><p>Go back and pick a student from the roster.</p></div></div>`;
    }
    const active = state.behaviors.filter((b) => b.active);
    const positives = active.filter((b) => b.tone === 'positive');
    const concerns = active.filter((b) => b.tone === 'concern');
    const other = active.find((b) => b.id === 'other');
    const history = state.incidents.filter((i) => i.studentId === student.id);
    const positiveCount = history.flatMap((i) => i.behaviors).filter((b) => b.tone === 'positive').length;
    const concernCount = history.flatMap((i) => i.behaviors).filter((b) => b.tone === 'concern').length;
    const showNoteHint = draft.behaviorIds.some(behaviorRequiresNote) && !draft.note.trim();

    return `<div class="view form-view">
      <header class="form-head">
        <button class="icon-btn" data-action="form-back" aria-label="Back">${icon('back')}</button>
        <span class="context-pill">${esc(classLabel(cls))}</span>
        <button class="icon-btn" data-action="view-student-history" aria-label="Student history">${icon('history')}</button>
      </header>

      <div class="student-head">
        ${avatarHTML(student, 'xl')}
        <h1>${esc(nameOf(student))}</h1>
        <p>${icon('clock')} <span id="logged-time">${esc(fmtEntryWhen(draft.occurredAt))}</span><span class="dot">·</span>${history.length} prior log${history.length === 1 ? '' : 's'}</p>
      </div>

      <section class="form-section">
        <h2>Positive</h2>
        ${positives.length ? `<div class="behavior-grid">${positives.map(behaviorCard).join('')}</div>` : '<p class="tiny">No positive behaviors enabled. Add some in Settings.</p>'}
      </section>

      <section class="form-section">
        <h2>Concern</h2>
        ${concerns.length ? `<div class="behavior-grid">${concerns.map(behaviorCard).join('')}</div>` : '<p class="tiny">No concern behaviors enabled. Add some in Settings.</p>'}
      </section>

      <section class="form-section">
        <h2>Other</h2>
        ${other ? behaviorCard(other).replace('class="behavior-card', 'class="behavior-card other-card') : ''}
      </section>

      <section class="form-section notes-section">
        <div class="label-row"><label for="note-input">Notes</label><span>Optional</span></div>
        <textarea id="note-input" rows="2" placeholder="Add context, what happened before, who else was involved…">${esc(draft.note)}</textarea>
        <p class="field-hint" id="other-hint" ${showNoteHint ? '' : 'hidden'}>Add a short note so this behavior is useful later.</p>
      </section>

      ${state.settings.showSeverity ? `<section class="form-section">
        <h2>Severity</h2>
        <div class="severity-row">
          ${['low', 'medium', 'high'].map((level) => `<button type="button" class="severity-chip ${draft.severity === level ? 'selected' : ''}" data-action="select-severity" data-level="${level}">${level[0].toUpperCase() + level.slice(1)}</button>`).join('')}
        </div>
      </section>` : ''}

      <div class="time-row">
        <span>${icon('clock')} Logged ${esc(fmtEntryWhen(draft.occurredAt))}</span>
        <button class="link-btn" data-action="edit-time">Change time</button>
      </div>

      <div class="history-row" hidden>${positiveCount}:${concernCount}</div>
    </div>

    <footer class="save-bar">
      <button class="btn primary" data-action="save">${icon('check')} Save entry</button>
      <button class="btn secondary" data-action="save-next">${icon('camera')} Save &amp; scan</button>
    </footer>`;
  }

  function toggleBehaviorCard(el) {
    if (!draft) return;
    const id = el.dataset.id;
    if (draft.behaviorIds.includes(id)) draft.behaviorIds = draft.behaviorIds.filter((x) => x !== id);
    else draft.behaviorIds.push(id);
    const on = draft.behaviorIds.includes(id);
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', String(on));
    updateOtherHint();
  }

  function updateOtherHint() {
    const hint = document.getElementById('other-hint');
    if (!hint) return;
    const needsNote = draft && draft.behaviorIds.some(behaviorRequiresNote);
    hint.hidden = !(needsNote && !draft.note.trim());
  }

  function formBack() {
    const hasChanges = draft && (draft.behaviorIds.length || draft.note.trim() || draft.severity);
    if (hasChanges && !window.confirm('Discard this entry?')) return;
    const back = draft?.back || (draft?.source === 'scan' ? '#/scan' : '#/home');
    draft = null;
    navigate(back);
  }

  function saveEntry(force = false, next = false) {
    if (!draft) return;
    const noteEl = document.getElementById('note-input');
    if (noteEl) draft.note = noteEl.value;
    const behaviorIds = [...draft.behaviorIds];
    if (!behaviorIds.length) { toast('Choose at least one behavior'); return; }
    const noteRequiredBy = behaviorIds.find(behaviorRequiresNote);
    if (noteRequiredBy && !draft.note.trim()) {
      const behavior = state.behaviors.find((b) => b.id === noteRequiredBy);
      toast(behavior?.id === 'other' ? 'Add a note for “Other”' : `Add a note for “${behavior?.label || 'this behavior'}”`);
      noteEl?.focus();
      return;
    }
    if (state.settings.warnDuplicates && !force) {
      const target = new Date(draft.occurredAt).getTime();
      const duplicate = sortedIncidents().find((incident) => incident.studentId === draft.studentId
        && Math.abs(new Date(incident.occurredAt).getTime() - target) < 120000
        && incident.behaviors.some((b) => behaviorIds.includes(b.id)));
      if (duplicate) {
        toast('A similar entry was just logged', { action: 'Save anyway', duration: 8000, onAction: () => saveEntry(true, next) });
        return;
      }
    }
    const snapshots = behaviorIds.map((id) => state.behaviors.find((b) => b.id === id))
      .filter(Boolean)
      .map((b) => ({ id: b.id, label: b.label, tone: b.tone, icon: b.icon }));
    if (!snapshots.length) { toast('Those behaviors are no longer available'); return; }
    const student = getStudent(draft.studentId);
    const incident = {
      id: `inc_${uid()}`,
      studentId: draft.studentId,
      classId: draft.classId,
      teacherId: 't1',
      behaviors: snapshots,
      note: draft.note.trim(),
      severity: draft.severity,
      occurredAt: draft.occurredAt,
      createdAt: new Date().toISOString(),
      source: draft.source || 'search'
    };
    state.incidents.push(incident);
    const undoId = incident.id;
    draft = null;
    saveState();
    if (state.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(15); } catch { /* noop */ }
    }
    autoStart = next;
    navigate(next ? '#/scan' : '#/home');
    toast(`Saved for ${student ? student.first : 'student'}`, {
      action: 'Undo',
      onAction: () => undoIncident(undoId)
    });
  }

  function undoIncident(id) {
    const index = state.incidents.findIndex((i) => i.id === id);
    if (index < 0) return;
    state.incidents.splice(index, 1);
    saveState();
    if (parseRoute().name !== 'scan') render();
    toast('Entry removed');
  }

  function openTimeSheet() {
    if (!draft) return;
    const date = new Date(draft.occurredAt);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">When did it happen?</p><h2>Entry time</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">Defaults to now. Adjust it if you are logging after class.</p>
      <label class="field"><span>Time</span><input type="time" id="entry-time" value="${hh}:${mm}"></label>
      <div class="sheet-actions">
        <button class="btn secondary" data-action="time-now">Now</button>
        <button class="btn primary" data-action="set-time">Set time</button>
      </div>
    `);
  }

  function setDraftTime(mode) {
    if (!draft) return;
    const now = new Date();
    let next = new Date(now);
    if (mode === 'custom') {
      const input = document.getElementById('entry-time');
      if (!input || !input.value) { toast('Pick a time first'); return; }
      const [h, m] = input.value.split(':').map(Number);
      next.setHours(h, m, 0, 0);
      if (next.getTime() > now.getTime() + 5 * 60000) { toast('That time is in the future'); return; }
    }
    draft.occurredAt = next.toISOString();
    closeSheet();
    render();
  }

  /* ------------------------------ Reports ------------------------------ */

  const REPORT_PRESETS = [
    ['today', 'Today'],
    ['7d', '7 days'],
    ['30d', '30 days'],
    ['month', 'This month'],
    ['custom', 'Custom']
  ];

  const toDateInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function getReportRange() {
    const preset = state.ui.reportPreset || '7d';
    const now = new Date();
    let start = startOfDay(now);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (preset === '7d') start = startOfDay(addDays(now, -6));
    else if (preset === '30d') start = startOfDay(addDays(now, -29));
    else if (preset === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (preset === 'custom') {
      const customStart = parseLocalDate(state.ui.reportStart);
      const customEnd = parseLocalDate(state.ui.reportEnd);
      if (customStart && customEnd && customStart <= customEnd) {
        start = startOfDay(customStart);
        end = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999);
      } else {
        start = startOfDay(addDays(now, -6));
      }
    }
    return { start, end, preset };
  }

  function filterReportIncidents(range, classId) {
    return sortedIncidents().filter((incident) => {
      if (classId && classId !== 'all' && incident.classId !== classId) return false;
      const time = new Date(incident.occurredAt).getTime();
      return time >= range.start.getTime() && time <= range.end.getTime();
    });
  }

  function rangeLabel(range) {
    if (range.preset === 'today') return `Today · ${fmtShort(range.start)}`;
    if (range.preset === 'month') return fmtDate(range.start, { month: 'long', year: 'numeric' });
    return `${fmtShort(range.start)} – ${fmtShort(range.end)}`;
  }

  function viewReports() {
    const range = getReportRange();
    const classId = state.ui.reportClassId;
    const cls = classId === 'all' ? null : getClass(classId);
    const incidents = filterReportIncidents(range, classId);
    const instances = incidents.flatMap((i) => i.behaviors);
    const positive = instances.filter((b) => b.tone === 'positive').length;
    const concern = instances.filter((b) => b.tone === 'concern').length;
    const share = positive + concern ? Math.round((positive / (positive + concern)) * 100) : null;
    const top = behaviorStats(incidents)[0];
    const studentCount = new Set(incidents.map((i) => i.studentId)).size;
    const tab = state.ui.reportTab;

    return `<div class="view">
      <header class="page-head">
        <div><p class="eyebrow">Behavior data</p><h1>Reports</h1></div>
        <button class="icon-btn" data-action="export-csv" aria-label="Export CSV">${icon('download')}</button>
      </header>

      <button class="context-pill wide" data-action="open-report-class">
        ${icon('users')} ${cls ? esc(classLabel(cls)) : 'All classes'} ${icon('chevron')}
      </button>

      <div class="range-chips">${REPORT_PRESETS.map(([id, label]) =>
        `<button class="range-chip ${state.ui.reportPreset === id ? 'active' : ''}" data-action="set-range" data-preset="${id}">${label}</button>`).join('')}</div>
      <div class="range-caption"><span>${esc(rangeLabel(range))}</span><span>${incidents.length} entr${incidents.length === 1 ? 'y' : 'ies'}</span></div>

      <div class="summary-grid">
        <div class="stat-card"><span class="stat-label">Entries</span><span class="stat-value">${incidents.length}</span><span class="stat-sub">in this range</span></div>
        <div class="stat-card"><span class="stat-label">Students</span><span class="stat-value">${studentCount}</span><span class="stat-sub">with an entry</span></div>
        <div class="stat-card"><span class="stat-label">Positive</span><span class="stat-value pos">${share === null ? '—' : share + '%'}</span><span class="stat-sub">${positive} positive · ${concern} concern</span></div>
        <div class="stat-card"><span class="stat-label">Most common</span><span class="stat-value small">${top ? esc(top.label) : '—'}</span><span class="stat-sub">${top ? top.count + ' occurrence' + (top.count === 1 ? '' : 's') : 'no behaviors'}</span></div>
      </div>

      <div class="tabs" role="tablist">
        <button class="${tab === 'overview' ? 'active' : ''}" data-action="set-report-tab" data-tab="overview">Overview</button>
        <button class="${tab === 'students' ? 'active' : ''}" data-action="set-report-tab" data-tab="students">Students</button>
        <button class="${tab === 'log' ? 'active' : ''}" data-action="set-report-tab" data-tab="log">Log</button>
      </div>

      ${tab === 'students' ? reportStudents(incidents) : tab === 'log' ? reportLog(incidents) : reportOverview(incidents, range)}
    </div>`;
  }

  function behaviorStats(incidents) {
    const map = new Map();
    for (const incident of incidents) {
      for (const b of incident.behaviors) {
        const key = b.label;
        if (!map.has(key)) map.set(key, { label: b.label, tone: b.tone || 'neutral', count: 0 });
        map.get(key).count++;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  function buildBuckets(incidents, range) {
    const days = [];
    const end = startOfDay(range.end);
    for (let d = startOfDay(range.start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    if (days.length <= 35) {
      return days.map((d) => ({
        label: String(d.getDate()),
        full: fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' }),
        count: incidents.filter((i) => sameDay(new Date(i.occurredAt), d)).length
      }));
    }
    const buckets = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const bucketStart = chunk[0];
      const bucketEnd = chunk[chunk.length - 1];
      buckets.push({
        label: fmtDate(bucketStart, { month: 'short', day: 'numeric' }),
        full: `${fmtShort(bucketStart)} – ${fmtShort(bucketEnd)}`,
        count: incidents.filter((incident) => {
          const time = new Date(incident.occurredAt);
          return time >= bucketStart && time < addDays(bucketEnd, 1);
        }).length
      });
    }
    return buckets;
  }

  function reportOverview(incidents) {
    if (!incidents.length) {
      return `<div class="empty">${icon('chart')}<strong>No entries in this range</strong><p>Try another date range, or log a behavior to see it here.</p></div>`;
    }
    const range = getReportRange();
    const buckets = buildBuckets(incidents, range);
    const maxBucket = Math.max(1, ...buckets.map((b) => b.count));
    const labelStep = Math.ceil(buckets.length / 6);
    const stats = behaviorStats(incidents);
    const maxStat = Math.max(1, ...stats.map((s) => s.count));
    const instances = incidents.flatMap((i) => i.behaviors);
    const positive = instances.filter((b) => b.tone === 'positive').length;
    const concern = instances.filter((b) => b.tone === 'concern').length;
    const neutral = instances.filter((b) => b.tone !== 'positive' && b.tone !== 'concern').length;
    const totalTone = Math.max(1, positive + concern + neutral);

    return `<div class="card">
      <div class="card-head"><h2>Entries over time</h2><span>${rangeLabel(range)}</span></div>
      <div class="chart-scroll">
        <div class="chart">
          ${buckets.map((bucket, index) => {
            const height = bucket.count ? Math.max(5, Math.round((bucket.count / maxBucket) * 100)) : 0;
            const show = buckets.length <= 10 || index % labelStep === 0 || index === buckets.length - 1;
            return `<div class="chart-col" title="${esc(bucket.full)}: ${bucket.count}">
              <div class="chart-bar-wrap"><div class="chart-bar ${bucket.count ? '' : 'zero'}" style="height:${bucket.count ? height : 3}%"></div></div>
              <span class="chart-label">${show ? esc(bucket.label) : ''}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Behaviors</h2><span>${instances.length} total</span></div>
      <div class="split-bar">
        <i style="width:${(positive / totalTone) * 100}%;background:var(--positive)"></i>
        <i style="width:${(concern / totalTone) * 100}%;background:var(--concern)"></i>
        <i style="width:${(neutral / totalTone) * 100}%;background:var(--neutral)"></i>
      </div>
      <div class="split-legend"><span><b>${positive}</b> positive</span><span><b>${concern}</b> concern</span>${neutral ? `<span><b>${neutral}</b> other</span>` : ''}</div>
      <div style="margin-top:12px">
        ${stats.slice(0, 8).map((stat) => `<div class="bar-row">
          <span class="bar-name"><i class="bar-dot" style="background:${stat.tone === 'positive' ? 'var(--positive)' : stat.tone === 'concern' ? 'var(--concern)' : 'var(--neutral)'}"></i>${esc(stat.label)}</span>
          <span class="bar-track"><span class="bar-fill ${stat.tone}" style="width:${Math.round((stat.count / maxStat) * 100)}%"></span></span>
          <span class="bar-count">${stat.count}</span>
        </div>`).join('')}
        ${stats.length > 8 ? `<p class="tiny" style="margin-top:6px">+${stats.length - 8} more behaviors in this range</p>` : ''}
      </div>
    </div>`;
  }

  function reportStudents(incidents) {
    if (!incidents.length) {
      return `<div class="empty">${icon('users')}<strong>No students in this range</strong><p>Try another date range or class.</p></div>`;
    }
    const map = new Map();
    for (const incident of incidents) {
      if (!map.has(incident.studentId)) {
        map.set(incident.studentId, { student: getStudent(incident.studentId), entries: [], behaviors: new Map() });
      }
      const record = map.get(incident.studentId);
      record.entries.push(incident);
      for (const b of incident.behaviors) record.behaviors.set(b.label, (record.behaviors.get(b.label) || 0) + 1);
    }
    const rows = Array.from(map.values()).filter((r) => r.student).sort((a, b) => b.entries.length - a.entries.length);
    return `<div class="card">${rows.map((record) => {
      const top = Array.from(record.behaviors.entries()).sort((a, b) => b[1] - a[1])[0];
      return `<button class="student-row" data-action="open-student-report" data-id="${record.student.id}">
        ${avatarHTML(record.student, 'sm')}
        <span class="grow"><strong>${esc(nameOf(record.student))}</strong><small>${record.entries.length} entr${record.entries.length === 1 ? 'y' : 'ies'}${top ? ` · ${esc(top[0])} ${top[1]}×` : ''}</small></span>
        <span class="count-badge">${record.entries.length}</span>
        ${icon('chevron')}
      </button>`;
    }).join('')}</div>`;
  }

  function reportLog(incidents) {
    if (!incidents.length) {
      return `<div class="empty">${icon('history')}<strong>No entries in this range</strong><p>Try another date range or class.</p></div>`;
    }
    const groups = new Map();
    for (const incident of incidents) {
      const key = new Date(incident.occurredAt).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(incident);
    }
    return Array.from(groups.values()).map((list) => {
      return `<div class="day-group">
        <h3>${fmtDayLabel(list[0].occurredAt)}</h3>
        ${list.map((incident) => {
          const student = getStudent(incident.studentId);
          if (!student) return '';
          return `<button class="log-entry" data-action="open-incident" data-id="${incident.id}">
            <span class="log-time">${esc(fmtTime(incident.occurredAt))}</span>
            ${avatarHTML(student, 'sm')}
            <span class="log-main">
              <span class="log-name">${esc(nameOf(student))}</span>
              <span class="chips">${incident.behaviors.slice(0, 2).map((b) => `<span class="chip ${b.tone}">${esc(b.label)}</span>`).join('')}${incident.behaviors.length > 2 ? `<span class="chip neutral">+${incident.behaviors.length - 2}</span>` : ''}</span>
              ${incident.note ? `<span class="log-note">${esc(incident.note)}</span>` : ''}
            </span>
            ${icon('chevron')}
          </button>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  function setReportPreset(preset) {
    if (preset === 'custom') { openRangeSheet(); return; }
    state.ui.reportPreset = preset;
    state.ui.reportStart = '';
    state.ui.reportEnd = '';
    saveState();
    closeSheet();
    render();
  }

  function openRangeSheet() {
    const now = new Date();
    const startValue = state.ui.reportStart || toDateInput(addDays(now, -6));
    const endValue = state.ui.reportEnd || toDateInput(now);
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Report filter</p><h2>Date range</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <div class="preset-grid">
        ${REPORT_PRESETS.filter(([id]) => id !== 'custom').map(([id, label]) =>
          `<button class="${state.ui.reportPreset === id ? 'active' : ''}" data-action="set-range" data-preset="${id}">${label}</button>`).join('')}
      </div>
      <div class="date-grid">
        <label class="field"><span>Start</span><input type="date" id="range-start" value="${startValue}"></label>
        <label class="field"><span>End</span><input type="date" id="range-end" value="${endValue}"></label>
      </div>
      <button class="btn primary block" data-action="apply-custom-range">Apply custom range</button>
      <p class="tiny" style="margin-top:10px;text-align:center">Dates are inclusive and use the school's local timezone.</p>
    `);
  }

  function applyCustomRange() {
    const startInput = document.getElementById('range-start');
    const endInput = document.getElementById('range-end');
    if (!startInput || !endInput) return;
    const start = parseLocalDate(startInput.value);
    const end = parseLocalDate(endInput.value);
    if (!start || !end) { toast('Pick both dates'); return; }
    if (start > end) { toast('Start date must be before end date'); return; }
    state.ui.reportPreset = 'custom';
    state.ui.reportStart = startInput.value;
    state.ui.reportEnd = endInput.value;
    saveState();
    closeSheet();
    render();
  }

  function openReportClassSheet() {
    const current = state.ui.reportClassId;
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Report filter</p><h2>Choose class</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <div class="sheet-list">
        <button class="sheet-row" data-action="pick-report-class" data-id="all">
          <span class="row-icon">${icon('chart', 'sm')}</span>
          <span class="grow"><strong>All classes</strong><small>Every class you teach</small></span>
          ${current === 'all' ? '<span class="chip">Current</span>' : icon('chevron')}
        </button>
        ${state.classes.map((c) => `<button class="sheet-row" data-action="pick-report-class" data-id="${c.id}">
          <span class="class-dot" style="background:${c.color}"></span>
          <span class="grow"><strong>${esc(classLabel(c))}</strong><small>Room ${esc(c.room)} · ${studentsInClass(c.id).length} students</small></span>
          ${current === c.id ? '<span class="chip">Current</span>' : icon('chevron')}
        </button>`).join('')}
      </div>
    `);
  }

  function exportCsv() {
    const range = getReportRange();
    const classId = state.ui.reportClassId;
    const incidents = filterReportIncidents(range, classId);
    if (!incidents.length) { toast('Nothing to export in this range'); return; }
    const cls = classId === 'all' ? null : getClass(classId);
    const cell = (value) => {
      let text = String(value == null ? '' : value);
      // Keep spreadsheet formulas from executing when a teacher opens the export.
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [['Date', 'Time', 'Student', 'Student ID', 'Class', 'Behaviors', 'Tone', 'Severity', 'Notes', 'Source']];
    for (const incident of incidents) {
      const student = getStudent(incident.studentId);
      const incidentClass = getClass(incident.classId);
      const tones = Array.from(new Set(incident.behaviors.map((b) => b.tone))).join('; ');
      rows.push([
        fmtDate(incident.occurredAt, { year: 'numeric', month: '2-digit', day: '2-digit' }),
        fmtTime(incident.occurredAt),
        student ? nameOf(student) : 'Unknown',
        student ? student.externalId : '',
        incidentClass ? classLabel(incidentClass) : '',
        incident.behaviors.map((b) => b.label).join('; '),
        tones,
        incident.severity || '',
        incident.note || '',
        incident.source || ''
      ]);
    }
    const csv = '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offense-tracker-${cls ? cls.period.replace(/\s+/g, '-').toLowerCase() : 'all-classes'}-${toDateInput(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${incidents.length} entr${incidents.length === 1 ? 'y' : 'ies'}`);
  }

  function openIncidentSheet(id) {
    const incident = state.incidents.find((i) => i.id === id);
    if (!incident) return;
    const student = getStudent(incident.studentId);
    const cls = getClass(incident.classId);
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Entry detail</p><h2>${esc(student ? nameOf(student) : 'Entry')}</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <div class="incident-detail">
        <div class="student-line">
          ${student ? avatarHTML(student) : ''}
          <div><strong>${esc(student ? nameOf(student) : 'Unknown student')}</strong><small>${esc(cls ? classLabel(cls) : '')}</small></div>
        </div>
        <p class="incident-when">${esc(fmtDate(incident.occurredAt, { weekday: 'long', month: 'long', day: 'numeric' }))} · ${esc(fmtTime(incident.occurredAt))}</p>
        <div class="chips">${incident.behaviors.map((b) => `<span class="chip ${b.tone}">${esc(b.label)}</span>`).join('')}${incident.severity ? `<span class="chip neutral">${esc(incident.severity)} severity</span>` : ''}</div>
        ${incident.note ? `<div class="note-box">${esc(incident.note)}</div>` : '<p class="sheet-sub">No note was added.</p>'}
        <p class="detail-meta">Logged via ${esc(incident.source || 'search')} · ${esc(incident.id)}</p>
        <button class="btn danger block" data-action="delete-incident" data-id="${incident.id}">${icon('trash')} Delete entry</button>
      </div>
    `);
  }

  function openStudentSheet(studentId, overrideIncidents) {
    const student = getStudent(studentId);
    if (!student) return;
    const allIncidents = overrideIncidents || sortedIncidents().filter((i) => i.studentId === studentId);
    const incidents = allIncidents.slice(0, 10);
    const allBehaviors = allIncidents.flatMap((i) => i.behaviors);
    const positive = allBehaviors.filter((b) => b.tone === 'positive').length;
    const concern = allBehaviors.filter((b) => b.tone === 'concern').length;
    const cls = incidents[0] ? getClass(incidents[0].classId) : getClass(student.classIds[0]);
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Student history</p><h2>${esc(nameOf(student))}</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <div class="student-line" style="margin-bottom:12px">${avatarHTML(student)}<div><strong>${esc(cls ? classLabel(cls) : '')}</strong><small>ID ${esc(student.externalId)}</small></div></div>
      <div class="history-stat-row">
        <div class="history-stat"><strong>${allIncidents.length}</strong><span>entries</span></div>
        <div class="history-stat"><strong style="color:var(--positive)">${positive}</strong><span>positive</span></div>
        <div class="history-stat"><strong style="color:var(--concern)">${concern}</strong><span>concern</span></div>
      </div>
      ${allIncidents.length > incidents.length ? `<p class="sheet-sub">Showing the 10 most recent entries.</p>` : ''}
      ${incidents.length ? `<div class="history-list">${incidents.map((incident) => `
        <div class="history-item">
          <div class="history-when">${esc(fmtDayLabel(incident.occurredAt))} · ${esc(fmtTime(incident.occurredAt))}</div>
          <div class="chips">${incident.behaviors.map((b) => `<span class="chip ${b.tone}">${esc(b.label)}</span>`).join('')}</div>
          ${incident.note ? `<div class="history-note">${esc(incident.note)}</div>` : ''}
        </div>`).join('')}</div>` : `<div class="empty">${icon('history')}<strong>No entries yet</strong><p>Scan or search this student to add one.</p></div>`}
    `);
  }

  /* ------------------------------ Roster ------------------------------ */

  function viewRoster() {
    const cls = getClass(state.selectedClassId) || state.classes[0];
    const roster = studentsInClass(cls.id).sort((a, b) => a.first.localeCompare(b.first));
    const logs30 = state.incidents.filter((i) => {
      const time = new Date(i.occurredAt).getTime();
      return time >= addDays(new Date(), -30).getTime();
    });
    return `<div class="view">
      <header class="roster-head">
        <div><p class="eyebrow">Class roster</p><h1>Students</h1></div>
        <div class="head-actions">
          <button class="icon-btn" data-action="add-student" data-class="${cls.id}" aria-label="Add a student">${icon('plus')}</button>
          <button class="icon-btn" data-action="show-qr" data-class="${cls.id}" aria-label="Print QR cards">${icon('printer')}</button>
        </div>
      </header>
      <button class="context-pill wide" data-action="open-class-sheet">${icon('users')} ${esc(classLabel(cls))} ${icon('chevron')}</button>
      <div class="roster-meta"><span>${roster.length} students</span> · <span>${logs30.filter((i) => i.classId === cls.id).length} logs in 30 days</span></div>
      <div class="search-field roster-search">
        ${icon('search')}
        <input id="roster-search" data-filter="roster-list" type="search" inputmode="search" autocomplete="off" placeholder="Search name or ID" aria-label="Search roster">
      </div>
      <div class="roster-list-page" id="roster-list">
        ${roster.length ? roster.map((student) => {
          const logs = logs30.filter((i) => i.classId === cls.id && i.studentId === student.id);
          const last = logs.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
          const search = `${student.first} ${student.last} ${student.externalId}`.toLowerCase();
          return `<button class="roster-row" data-action="open-student" data-id="${student.id}" data-class="${cls.id}" data-source="roster" data-back="#/roster" data-search="${esc(search)}">
            ${avatarHTML(student)}
            <span class="roster-main"><strong>${esc(nameOf(student))}</strong><small>ID ${esc(student.externalId)}${last ? ` · ${esc(fmtDayLabel(last.occurredAt))}` : ''}</small></span>
            <span class="roster-count"><b>${logs.length}</b><small>30d</small></span>
            ${icon('chevron')}
          </button>`;
        }).join('') : `<div class="empty">${icon('users')}<strong>No students yet</strong><p>Add students to this class to start logging.</p></div>`}
        <p class="list-empty" id="list-empty" hidden>No students match that search.</p>
      </div>
      <div class="roster-actions">
        <button class="btn secondary" data-action="add-student" data-class="${cls.id}">${icon('plus')} Add student</button>
        <button class="btn secondary" data-action="show-qr" data-class="${cls.id}">${icon('printer')} Print QR</button>
      </div>
      <p class="roster-bulk-row"><button class="link-btn" data-action="bulk-add-students" data-class="${cls.id}">${icon('users', 'sm')} Bulk add students</button></p>
    </div>`;
  }

  /* ------------------------------ Settings ------------------------------ */

  function viewSettings() {
    const groups = [['positive', 'Positive'], ['concern', 'Concern'], ['neutral', 'Other']];
    return `<div class="view">
      <header class="page-head"><div><p class="eyebrow">Preferences</p><h1>Settings</h1></div></header>

      <section class="settings-section">
        <h2>Behaviors</h2>
        <div class="settings-card">
          ${groups.map(([tone, label]) => {
            const list = state.behaviors.filter((b) => b.tone === tone);
            if (!list.length) return '';
            return `<div class="behavior-group-label">${label}</div>${list.map(behaviorSettingRow).join('')}`;
          }).join('')}
          <button class="setting-action" data-action="add-behavior">
            <span class="row-icon">${icon('plus', 'sm')}</span>
            <span class="grow"><strong>Add behavior</strong><small>Positive, concern, or something custom</small></span>
            ${icon('chevron')}
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2>Logging</h2>
        <div class="settings-card">
          ${settingToggleRow('showSeverity', 'Show severity', 'Adds an optional Low / Medium / High row to the form.')}
          ${settingToggleRow('requireOtherNote', 'Require a note for Other', 'Keeps “Other” from becoming a meaningless category.')}
          ${settingToggleRow('haptics', 'Haptic and sound on scan', 'A short pulse and beep when a student code is recognized.')}
          ${settingToggleRow('warnDuplicates', 'Warn about duplicates', 'Flags a similar entry for the same student within two minutes.')}
        </div>
      </section>

      <section class="settings-section">
        <h2>Classroom & QR</h2>
        <div class="settings-card">
          ${state.classes.map((c) => `<button class="setting-action" data-action="show-qr" data-class="${c.id}">
            <span class="class-dot" style="background:${c.color}"></span>
            <span class="grow"><strong>${esc(classLabel(c))}</strong><small>${studentsInClass(c.id).length} student QR cards · print & scan</small></span>
            ${icon('printer')}
          </button>`).join('')}
          <button class="setting-action" data-action="add-class">
            <span class="row-icon">${icon('plus', 'sm')}</span>
            <span class="grow"><strong>Add a class</strong><small>Create a class and start its roster</small></span>
            ${icon('chevron')}
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2>Data</h2>
        <div class="settings-card">
          <button class="setting-action" data-action="reset-data">
            <span class="row-icon">${icon('undo', 'sm')}</span>
            <span class="grow"><strong>Reset demo data</strong><small>Restore the seeded roster and entries</small></span>
            ${icon('chevron')}
          </button>
          <button class="setting-action" data-action="logout">
            <span class="row-icon">${icon('user', 'sm')}</span>
            <span class="grow"><strong>Sign out</strong><small>${esc(state.teacher.email)}</small></span>
            ${icon('chevron')}
          </button>
        </div>
      </section>

      <p class="version">Offense Tracker · mobile design prototype · mock data only</p>
    </div>`;
  }

  function behaviorSettingRow(b) {
    const toneLabel = b.tone === 'positive' ? 'Positive' : b.tone === 'concern' ? 'Concern' : 'Other';
    const sub = b.system ? 'Always available · system behavior' : `${toneLabel}${b.requiresNote ? ' · note required' : ''}`;
    return `<div class="setting-row">
      <span class="row-icon">${esc(b.icon)}</span>
      <span class="grow"><strong>${esc(b.label)}</strong><small>${sub}</small></span>
      ${b.system ? '<span class="locked">Always on</span>' : `<label class="switch" aria-label="Enable ${esc(b.label)}"><input type="checkbox" data-behavior-toggle="${b.id}" ${b.active ? 'checked' : ''}><span></span></label><button class="icon-btn sm danger" data-action="delete-behavior" data-id="${b.id}" aria-label="Delete ${esc(b.label)}">${icon('trash', 'sm')}</button>`}
    </div>`;
  }

  function settingToggleRow(key, title, sub) {
    return `<div class="setting-row">
      <span class="grow"><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>
      <label class="switch" aria-label="${esc(title)}"><input type="checkbox" data-setting="${key}" ${state.settings[key] ? 'checked' : ''}><span></span></label>
    </div>`;
  }

  function openAddBehaviorSheet() {
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Behavior settings</p><h2>Add a behavior</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <form data-form="add-behavior">
        <label class="field"><span>Name</span><input id="behavior-label" maxlength="32" placeholder="e.g. Hall pass, Kindness" required></label>
        <div class="field"><span>Category</span>
          <div class="segmented">
            <label><input type="radio" name="tone" value="concern" checked><span>Concern</span></label>
            <label><input type="radio" name="tone" value="positive"><span>Positive</span></label>
          </div>
        </div>
        <label class="field"><span>Emoji (optional)</span><input id="behavior-icon" maxlength="4" placeholder="⭐"></label>
        <label class="checkline"><input type="checkbox" id="behavior-note"> Require a note for this behavior</label>
        <button class="btn primary block" type="submit">${icon('plus')} Add behavior</button>
      </form>
    `);
  }

  function addBehaviorFromForm(form) {
    const labelInput = document.getElementById('behavior-label');
    const iconInput = document.getElementById('behavior-icon');
    const noteInput = document.getElementById('behavior-note');
    const tone = form.querySelector('input[name="tone"]:checked')?.value || 'concern';
    const label = labelInput ? labelInput.value.trim() : '';
    if (!label) { toast('Give the behavior a name'); return; }
    const fallbackIcon = tone === 'positive' ? '⭐' : '⚠️';
    state.behaviors.push({
      id: `b_${uid()}`,
      label,
      tone,
      icon: (iconInput && iconInput.value.trim()) || fallbackIcon,
      active: true,
      requiresNote: !!noteInput?.checked
    });
    saveState();
    closeSheet();
    render();
    toast('Behavior added');
  }

  function deleteBehavior(id) {
    const behavior = state.behaviors.find((b) => b.id === id);
    if (!behavior) return;
    if (behavior.system) { toast('“Other” is always available'); return; }
    if (!window.confirm(`Remove “${behavior.label}” from the form?\n\nPast entries keep their labels.`)) return;
    state.behaviors = state.behaviors.filter((b) => b.id !== id);
    saveState();
    render();
    toast('Behavior removed');
  }

  function resetDemo() {
    if (!window.confirm('Reset all demo data?\n\nThis clears entries, custom behaviors, and preferences.')) return;
    localStorage.removeItem(LS_KEY);
    state = seedState();
    state.auth = true;
    draft = null;
    saveState();
    closeSheet();
    if (location.hash === '#/home') render();
    else navigate('#/home');
    toast('Demo data reset');
  }

  /* ------------------------------ Classes & students ------------------------------ */

  function openAddClassSheet() {
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">Classroom setup</p><h2>Add a class</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">Create the class first, then add students to its roster. You can switch classes any time from the class chip.</p>
      <form data-form="add-class">
        <label class="field"><span>Class name</span><input id="class-name" maxlength="40" placeholder="e.g. Geometry" required></label>
        <div class="date-grid">
          <label class="field"><span>Period</span><input id="class-period" maxlength="20" placeholder="e.g. Period 8" required></label>
          <label class="field"><span>Room</span><input id="class-room" maxlength="20" placeholder="e.g. 214"></label>
        </div>
        <button class="btn primary block" type="submit">${icon('plus')} Create class</button>
      </form>
    `);
  }

  function addClassFromForm(form) {
    const nameInput = document.getElementById('class-name');
    const periodInput = document.getElementById('class-period');
    const roomInput = document.getElementById('class-room');
    const name = nameInput ? nameInput.value.trim() : '';
    const rawPeriod = periodInput ? periodInput.value.trim() : '';
    if (!name || !rawPeriod) { toast('Add a class name and period'); return; }
    const period = /^\d+$/.test(rawPeriod) ? `Period ${rawPeriod}` : rawPeriod;
    const room = (roomInput && roomInput.value.trim()) || 'TBD';
    const cls = {
      id: `c_${uid()}`,
      period,
      name,
      room,
      color: CLASS_COLORS[state.classes.length % CLASS_COLORS.length]
    };
    state.classes.push(cls);
    state.selectedClassId = cls.id;
    state.ui.reportClassId = cls.id;
    saveState();
    closeSheet();
    navigate('#/roster');
    toast(`${classLabel(cls)} created — add students`);
  }

  function openAddStudentSheet(classId) {
    const cls = getClass(classId) || getClass(state.selectedClassId);
    if (!cls) return;
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">${esc(classLabel(cls))}</p><h2>Add a student</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">Enter the name and the ID printed on the student card. If that ID is already on another roster, they join this class too.</p>
      <form data-form="add-student" data-class="${cls.id}">
        <div class="date-grid">
          <label class="field"><span>First name</span><input id="student-first" maxlength="30" placeholder="Maya" required></label>
          <label class="field"><span>Last name</span><input id="student-last" maxlength="30" placeholder="Rodriguez" required></label>
        </div>
        <label class="field"><span>Student ID</span><input id="student-external-id" maxlength="32" placeholder="e.g. 100100022" required></label>
        <button class="btn primary block" type="submit">${icon('plus')} Add student</button>
      </form>
      <p class="bulk-link-row"><button class="link-btn" data-action="bulk-add-students" data-class="${cls.id}">Adding a whole roster? Paste a list instead</button></p>
    `);
  }

  function addStudentFromForm(form) {
    const classId = form.dataset.class;
    const cls = getClass(classId);
    if (!cls) { toast('That class no longer exists'); return; }
    const firstInput = document.getElementById('student-first');
    const lastInput = document.getElementById('student-last');
    const idInput = document.getElementById('student-external-id');
    const first = firstInput ? firstInput.value.trim() : '';
    const last = lastInput ? lastInput.value.trim() : '';
    const externalId = idInput ? idInput.value.trim() : '';
    if (!first || !last || !externalId) { toast('Add a first name, last name, and student ID'); return; }

    const existing = state.students.find((s) => s.externalId.toLowerCase() === externalId.toLowerCase());
    if (existing) {
      if (existing.classIds.includes(classId)) {
        toast(`${nameOf(existing)} is already in this class`);
        return;
      }
      existing.classIds.push(classId);
      saveState();
      closeSheet();
      render();
      toast(`${nameOf(existing)} added to ${classShort(cls)}`);
      return;
    }

    const student = {
      id: `s_${uid()}`,
      first,
      last,
      externalId,
      classIds: [classId],
      color: STUDENT_COLORS[state.students.length % STUDENT_COLORS.length]
    };
    state.students.push(student);
    saveState();
    closeSheet();
    render();
    toast(`${nameOf(student)} added to ${classShort(cls)}`);
  }

  const BULK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$/;

  function parseBulkStudents(text, classId) {
    const rows = [];
    const seen = new Set();
    const lines = String(text || '').replace(/\r/g, '').split('\n');

    lines.forEach((line, index) => {
      const raw = line.trim();
      if (!raw || raw.startsWith('#')) return;
      if (index === 0 && /first|last|name/i.test(raw) && /\bid\b/i.test(raw)) return;

      const parts = raw.split(/\t|,/).map((part) => part.trim());
      let first = '';
      let last = '';
      let externalId = '';

      if (parts.length === 2) {
        externalId = parts[1];
        const tokens = parts[0].split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          first = tokens[0];
          last = tokens.slice(1).join(' ');
        } else {
          first = parts[0];
        }
      } else if (parts.length >= 3) {
        first = parts[0];
        externalId = parts[parts.length - 1];
        last = parts.slice(1, -1).join(' ').trim();
      } else {
        externalId = '';
      }

      let error = '';
      if (!parts[0] || !externalId) error = 'Use name, ID — or first, last, ID.';
      else if (!first) error = 'Add a first and last name.';
      else if (!last) error = 'Add a last name (or use first, last, ID).';
      else if (!BULK_ID_RE.test(externalId)) error = 'The student ID has unsupported characters.';
      else if (first.length > 30 || last.length > 30) error = 'Names must be 30 characters or fewer.';

      if (error) {
        rows.push({ line: index + 1, raw, first, last, externalId, error, action: 'error' });
        return;
      }

      const key = externalId.toLowerCase();
      if (seen.has(key)) {
        rows.push({ line: index + 1, raw, first, last, externalId, error: '', action: 'duplicate' });
        return;
      }
      seen.add(key);

      const existing = state.students.find((s) => s.externalId.toLowerCase() === key);
      const action = !existing ? 'new' : existing.classIds.includes(classId) ? 'existing' : 'enroll';
      rows.push({ line: index + 1, raw, first, last, externalId, error: '', action, existing });
    });

    return { rows, errors: rows.filter((row) => row.error) };
  }

  function bulkPreviewHTML(parsed, text) {
    if (!String(text || '').trim()) {
      return '<p class="bulk-empty">Paste one student per line to see a preview.</p>';
    }
    const counts = {
      new: parsed.rows.filter((row) => row.action === 'new').length,
      enroll: parsed.rows.filter((row) => row.action === 'enroll').length,
      skip: parsed.rows.filter((row) => row.action === 'existing' || row.action === 'duplicate').length
    };
    const issues = parsed.rows.filter((row) => row.error);
    const duplicates = parsed.rows.filter((row) => row.action === 'duplicate');
    return `
      <div class="bulk-summary">
        <span class="bulk-stat"><strong>${counts.new}</strong><small>new</small></span>
        <span class="bulk-stat"><strong>${counts.enroll}</strong><small>joining</small></span>
        <span class="bulk-stat"><strong>${counts.skip}</strong><small>skipped</small></span>
      </div>
      ${counts.skip ? `<p class="bulk-note">${counts.skip} already in this class or repeated in the list.</p>` : ''}
      ${duplicates.length ? `<p class="bulk-note">Repeated IDs: ${duplicates.map((row) => `line ${row.line}`).join(', ')}.</p>` : ''}
      ${issues.length ? `<div class="bulk-issues"><strong>${issues.length} line${issues.length === 1 ? '' : 's'} need attention</strong>${issues.slice(0, 5).map((row) => `<span>Line ${row.line}: ${esc(row.error)}</span>`).join('')}${issues.length > 5 ? `<span>…and ${issues.length - 5} more.</span>` : ''}</div>` : ''}
    `;
  }

  function updateBulkPreview() {
    const preview = document.getElementById('bulk-preview');
    const input = document.getElementById('bulk-students');
    const form = document.querySelector('[data-form="bulk-add-students"]');
    if (!preview || !input || !form) return null;
    const parsed = parseBulkStudents(input.value, form.dataset.class);
    preview.innerHTML = bulkPreviewHTML(parsed, input.value);
    return parsed;
  }

  function openBulkAddSheet(classId) {
    const cls = getClass(classId) || getClass(state.selectedClassId);
    if (!cls) return;
    openSheet(`
      <div class="sheet-grabber"></div>
      <div class="sheet-head"><div><p class="eyebrow">${esc(classLabel(cls))}</p><h2>Bulk add students</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <p class="sheet-sub">Paste a list or a spreadsheet column. Existing student IDs are added to this class instead of duplicated.</p>
      <form data-form="bulk-add-students" data-class="${cls.id}">
        <label class="field"><span>Students</span><textarea id="bulk-students" class="bulk-textarea" rows="8" maxlength="10000" placeholder="Maya Rodriguez, 100100001&#10;Ethan Chen, 100100002"></textarea></label>
        <p class="bulk-format">One student per line. Two columns: <strong>name, ID</strong>. Three columns: <strong>first, last, ID</strong>.</p>
        <div class="bulk-preview" id="bulk-preview" aria-live="polite"></div>
        <button class="btn primary block" type="submit">${icon('plus')} Add students</button>
      </form>
    `);
    updateBulkPreview();
  }

  function bulkAddStudentsFromForm(form) {
    const input = document.getElementById('bulk-students');
    const classId = form.dataset.class;
    const cls = getClass(classId);
    if (!input || !cls) { toast('That class no longer exists'); return; }

    const parsed = parseBulkStudents(input.value, classId);
    if (!parsed.rows.length) { toast('Paste at least one student first'); input.focus(); return; }
    if (parsed.errors.length) {
      updateBulkPreview();
      toast(`Fix ${parsed.errors.length} line${parsed.errors.length === 1 ? '' : 's'} before importing`);
      input.focus();
      return;
    }

    let added = 0;
    let enrolled = 0;
    let skipped = 0;
    for (const row of parsed.rows) {
      if (row.action === 'existing' || row.action === 'duplicate') { skipped++; continue; }
      if (row.action === 'enroll') {
        const existing = state.students.find((s) => s.externalId.toLowerCase() === row.externalId.toLowerCase());
        if (!existing || existing.classIds.includes(classId)) { skipped++; continue; }
        existing.classIds.push(classId);
        enrolled++;
        continue;
      }
      state.students.push({
        id: `s_${uid()}`,
        first: row.first,
        last: row.last,
        externalId: row.externalId,
        classIds: [classId],
        color: STUDENT_COLORS[state.students.length % STUDENT_COLORS.length]
      });
      added++;
    }

    if (!added && !enrolled) {
      toast(`No new students — ${skipped} already in this class`);
      return;
    }

    saveState();
    closeSheet();
    render();
    toast(`${added} new${enrolled ? ` · ${enrolled} joined` : ''}${skipped ? ` · ${skipped} skipped` : ''} for ${classShort(cls)}`, { duration: 6000 });
  }

  /* ------------------------------ QR cards ------------------------------ */

  function openQrSheet(classId) {
    const cls = getClass(classId) || getClass(state.selectedClassId);
    if (!cls) return;
    const roster = studentsInClass(cls.id).sort((a, b) => a.last.localeCompare(b.last));
    openSheet(`
      <div class="sheet-grabber no-print"></div>
      <div class="sheet-head no-print"><div><p class="eyebrow">Print &amp; scan</p><h2>Student QR cards</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <div class="qr-header-row no-print">
        <p>${esc(classLabel(cls))} · ${roster.length} cards</p>
        <button class="btn primary sm" data-action="print-qr">${icon('printer')} Print</button>
      </div>
      <h2 class="qr-print-title">${esc(classLabel(cls))} · student QR cards</h2>
      <div class="qr-grid">
        ${roster.map((student) => `<div class="qr-card">
          <div class="qr-canvas" data-qr="${esc(studentQrUrl(student))}"></div>
          <p class="qr-name">${esc(nameOf(student))}</p>
          <p class="qr-meta">${esc(classShort(cls))}</p>
          <p class="qr-code">ID ${esc(student.externalId)}</p>
        </div>`).join('')}
      </div>
      <p class="qr-foot no-print">Scan a card with any phone camera to open that student’s form. Demo cards use readable student IDs; production cards use opaque, revocable tokens with no student PII. Print on 2×6 labels or card stock.</p>
    `, 'qr-sheet');

    loadScript(QRCODE_SRC).then(() => {
      if (!window.QRCode) return;
      $$('.qr-canvas', sheetRoot).forEach((container) => {
        try {
          container.innerHTML = '';
          new window.QRCode(container, {
            text: container.dataset.qr,
            width: 244,
            height: 244,
            colorDark: '#0d1526',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M
          });
        } catch (err) { console.warn('QR render failed', err); }
      });
    }).catch(() => toast('QR generator could not load. Check the connection.'));
  }

  /* ------------------------------ Input filters ------------------------------ */

  function filterList(input) {
    const target = document.getElementById(input.dataset.filter);
    if (!target) return;
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    $$('[data-search]', target).forEach((row) => {
      const match = !query || row.dataset.search.includes(query);
      row.hidden = !match;
      if (match) shown++;
    });
    const empty = document.getElementById('list-empty');
    if (empty) empty.hidden = shown > 0;
  }

  /* ------------------------------ Events ------------------------------ */

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    switch (action) {
      case 'close-sheet':
        closeSheet();
        break;
      case 'login': {
        state.auth = true;
        saveState();
        const next = takeNext();
        navigate(next && next !== '#/login' ? next : '#/home');
        break;
      }
      case 'logout':
        state.auth = false;
        draft = null;
        saveState();
        closeSheet();
        navigate('#/login');
        break;
      case 'nav':
        navigate(el.dataset.href || '#/home');
        break;
      case 'open-class-sheet':
        openClassSheet();
        break;
      case 'pick-class': {
        const cls = getClass(el.dataset.id);
        if (!cls) break;
        state.selectedClassId = cls.id;
        state.ui.reportClassId = cls.id;
        saveState();
        closeSheet();
        render();
        toast(`Class set to ${classShort(cls)}`);
        break;
      }
      case 'pick-scan-class': {
        const cls = getClass(el.dataset.id);
        const student = getStudent(el.dataset.student);
        if (!cls || !student) break;
        state.selectedClassId = cls.id;
        state.ui.reportClassId = cls.id;
        saveState();
        closeSheet();
        openStudent(student.id, 'scan', cls.id);
        break;
      }
      case 'start-scan':
        startScanner();
        break;
      case 'torch':
        toggleTorch(el);
        break;
      case 'simulate-scan':
        handleDemoScan(el.dataset.mode);
        break;
      case 'show-demo-sheet':
        openDemoSheet();
        break;
      case 'open-student':
        openStudent(el.dataset.id, el.dataset.source || 'search', el.dataset.class, el.dataset.back);
        break;
      case 'add-class':
        openAddClassSheet();
        break;
      case 'add-student':
        openAddStudentSheet(el.dataset.class);
        break;
      case 'bulk-add-students':
        openBulkAddSheet(el.dataset.class);
        break;
      case 'select-behavior':
        toggleBehaviorCard(el);
        break;
      case 'select-severity':
        if (!draft) break;
        draft.severity = draft.severity === el.dataset.level ? null : el.dataset.level;
        $$('.severity-chip').forEach((chip) => chip.classList.toggle('selected', chip.dataset.level === draft.severity));
        break;
      case 'save':
        saveEntry(false, false);
        break;
      case 'save-next':
        saveEntry(false, true);
        break;
      case 'form-back':
        formBack();
        break;
      case 'edit-time':
        openTimeSheet();
        break;
      case 'time-now':
        setDraftTime('now');
        break;
      case 'set-time':
        setDraftTime('custom');
        break;
      case 'view-student-history':
        if (draft) openStudentSheet(draft.studentId);
        break;
      case 'set-range':
        setReportPreset(el.dataset.preset);
        break;
      case 'apply-custom-range':
        applyCustomRange();
        break;
      case 'set-report-tab':
        state.ui.reportTab = el.dataset.tab;
        saveState();
        render();
        break;
      case 'open-report-class':
        openReportClassSheet();
        break;
      case 'pick-report-class':
        state.ui.reportClassId = el.dataset.id;
        saveState();
        closeSheet();
        render();
        break;
      case 'export-csv':
        exportCsv();
        break;
      case 'open-incident':
        closeSheet();
        openIncidentSheet(el.dataset.id);
        break;
      case 'open-student-report': {
        const range = getReportRange();
        const all = filterReportIncidents(range, state.ui.reportClassId).filter((i) => i.studentId === el.dataset.id);
        closeSheet();
        openStudentSheet(el.dataset.id, all);
        break;
      }
      case 'delete-incident': {
        const incident = state.incidents.find((i) => i.id === el.dataset.id);
        if (!incident) break;
        if (!window.confirm('Delete this entry?')) break;
        const index = state.incidents.findIndex((i) => i.id === incident.id);
        state.incidents.splice(index, 1);
        saveState();
        closeSheet();
        render();
        toast('Entry deleted', {
          action: 'Undo',
          onAction: () => {
            state.incidents.splice(index, 0, incident);
            saveState();
            render();
            toast('Entry restored');
          }
        });
        break;
      }
      case 'add-behavior':
        openAddBehaviorSheet();
        break;
      case 'delete-behavior':
        deleteBehavior(el.dataset.id);
        break;
      case 'show-qr':
        closeSheet();
        openQrSheet(el.dataset.class);
        break;
      case 'print-qr':
        window.print();
        break;
      case 'reset-data':
        resetDemo();
        break;
      default:
        break;
    }
  });

  document.addEventListener('change', (event) => {
    const setting = event.target.dataset.setting;
    if (setting) {
      state.settings[setting] = event.target.checked;
      saveState();
      return;
    }
    const behaviorId = event.target.dataset.behaviorToggle;
    if (behaviorId) {
      const behavior = state.behaviors.find((b) => b.id === behaviorId);
      if (behavior) {
        behavior.active = event.target.checked;
        saveState();
        toast(`${behavior.label} ${behavior.active ? 'shown' : 'hidden'}`);
      }
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === 'add-behavior') addBehaviorFromForm(form);
    else if (form.dataset.form === 'add-class') addClassFromForm(form);
    else if (form.dataset.form === 'add-student') addStudentFromForm(form);
    else if (form.dataset.form === 'bulk-add-students') bulkAddStudentsFromForm(form);
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('#student-search, #roster-search')) {
      filterList(event.target);
      return;
    }
    if (event.target.matches('#bulk-students')) {
      updateBulkPreview();
      return;
    }
    if (event.target.matches('#note-input') && draft) {
      draft.note = event.target.value;
      updateOtherHint();
      const el = event.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheet();
  });

  window.addEventListener('hashchange', render);

  if (!location.hash) {
    history.replaceState(null, '', state.auth ? '#/home' : '#/login');
  }
  render();



})();
