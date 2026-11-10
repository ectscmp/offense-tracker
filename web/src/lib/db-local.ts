import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Behavior,
  BehaviorTone,
  Classroom,
  DashboardData,
  DateWindow,
  Incident,
  ReportData,
  RosterStudent,
  Student,
  Teacher,
} from "./types";
import { endOfToday, startOfDaysAgo, startOfToday } from "./format";
import type { BulkStudentRow } from "./parse-students";

/*
 * Development-only JSON store. This module implements the same API as
 * ./db.ts (Mongo) so pages and server actions do not care which backend is
 * active. Data lives in web/.data/dev-db.json and is never imported into a
 * production request path.
 */

const DATA_FILE = path.join(process.cwd(), ".data", "dev-db.json");

const CLASS_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];
const STUDENT_COLORS = [
  "#f59e0b",
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

type LocalTeacher = Teacher & { createdAt: string };
type LocalClassroom = Classroom & { createdAt: string };
type LocalStudent = Student & {
  teacherId: string;
  externalIdLower: string;
  classIds: string[];
  createdAt: string;
};
type LocalBehavior = Behavior & {
  teacherId: string;
  active: boolean;
  sortOrder: number;
};
type LocalIncident = Incident & { teacherId: string; createdAt: string };
type LocalSettings = {
  teacherId: string;
  showSeverity: boolean;
  requireOtherNote: boolean;
  haptics: boolean;
  warnDuplicates: boolean;
};

type LocalData = {
  version: 1;
  teachers: LocalTeacher[];
  classes: LocalClassroom[];
  students: LocalStudent[];
  behaviors: LocalBehavior[];
  incidents: LocalIncident[];
  settings: LocalSettings[];
};

const globalForLocalDb = globalThis as unknown as {
  __offenseLocalDb?: {
    data: LocalData | null;
    loading: Promise<LocalData> | null;
    lock: Promise<unknown>;
  };
};

function state() {
  if (!globalForLocalDb.__offenseLocalDb) {
    globalForLocalDb.__offenseLocalDb = {
      data: null,
      loading: null,
      lock: Promise.resolve(),
    };
  }
  return globalForLocalDb.__offenseLocalDb;
}

function assertLocalStore() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.DEV_STORE?.trim().toLowerCase() === "mongo"
  ) {
    throw new Error("The local development store is not enabled.");
  }
}

function emptyData(): LocalData {
  return {
    version: 1,
    teachers: [],
    classes: [],
    students: [],
    behaviors: [],
    incidents: [],
    settings: [],
  };
}

function normalizeData(raw: unknown): LocalData {
  if (!raw || typeof raw !== "object") return emptyData();
  const record = raw as Partial<LocalData>;

  return {
    version: 1,
    teachers: Array.isArray(record.teachers) ? record.teachers : [],
    classes: Array.isArray(record.classes)
      ? record.classes.map((classroom) => ({
          ...classroom,
          archivedAt: classroom.archivedAt ?? null,
          createdAt: classroom.createdAt ?? new Date().toISOString(),
        }))
      : [],
    students: Array.isArray(record.students)
      ? record.students.map((student) => ({
          ...student,
          externalIdLower: student.externalIdLower ?? student.externalId.toLowerCase(),
          classIds: Array.isArray(student.classIds) ? student.classIds : [],
        }))
      : [],
    behaviors: Array.isArray(record.behaviors) ? record.behaviors : [],
    incidents: Array.isArray(record.incidents) ? record.incidents : [],
    settings: Array.isArray(record.settings) ? record.settings : [],
  };
}

async function readFromDisk(): Promise<LocalData> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
    throw error;
  }
}

async function load(): Promise<LocalData> {
  assertLocalStore();
  const current = state();
  if (current.data) return current.data;
  if (!current.loading) current.loading = readFromDisk();

  try {
    current.data = await current.loading;
  } catch (error) {
    current.loading = null;
    throw error;
  }
  return current.data;
}

async function persist(data: LocalData): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function withLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const current = state();
  const run = current.lock.then(fn, fn);
  current.lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function mutate<T>(fn: (data: LocalData) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    const data = await load();
    const result = await fn(data);
    await persist(data);
    return result;
  });
}

function read<T>(fn: (data: LocalData) => T): Promise<T> {
  return withLock(async () => fn(await load()));
}

function byName(a: { lastName: string; firstName: string }, b: { lastName: string; firstName: string }) {
  const last = a.lastName.localeCompare(b.lastName, "en", { sensitivity: "base" });
  if (last !== 0) return last;
  return a.firstName.localeCompare(b.firstName, "en", { sensitivity: "base" });
}

function newQrToken() {
  return randomUUID().replaceAll("-", "");
}

function toClassroom(doc: LocalClassroom): Classroom {
  return {
    id: doc.id,
    teacherId: doc.teacherId,
    period: doc.period,
    name: doc.name,
    room: doc.room,
    color: doc.color,
    archivedAt: doc.archivedAt,
  };
}

function toStudent(doc: LocalStudent): Student {
  return {
    id: doc.id,
    firstName: doc.firstName,
    lastName: doc.lastName,
    externalId: doc.externalId,
    qrToken: doc.qrToken,
    color: doc.color,
  };
}

function toBehavior(doc: LocalBehavior): Behavior {
  return {
    id: doc.id,
    label: doc.label,
    tone: doc.tone,
    icon: doc.icon,
    system: doc.system,
    requiresNote: doc.requiresNote,
  };
}

function toIncident(doc: LocalIncident): Incident {
  return {
    id: doc.id,
    studentId: doc.studentId,
    classId: doc.classId,
    occurredAt: doc.occurredAt,
    note: doc.note,
    severity: doc.severity,
    source: doc.source,
    behaviors: doc.behaviors.map((behavior) => ({
      id: behavior.id,
      label: behavior.label,
      tone: behavior.tone,
      icon: behavior.icon,
    })),
  };
}

function classesFor(data: LocalData, teacherId: string): LocalClassroom[] {
  return data.classes
    .filter((classroom) => classroom.teacherId === teacherId && classroom.archivedAt === null)
    .sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.period.localeCompare(b.period),
    );
}

function archivedClassesFor(data: LocalData, teacherId: string): LocalClassroom[] {
  return data.classes
    .filter((classroom) => classroom.teacherId === teacherId && classroom.archivedAt !== null)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
}

function classById(data: LocalData, teacherId: string, classId: string) {
  return (
    data.classes.find(
      (classroom) => classroom.id === classId && classroom.teacherId === teacherId,
    ) ?? null
  );
}

function selectFallbackClass(data: LocalData, teacherId: string, removedClassId: string) {
  const teacher = data.teachers.find((candidate) => candidate.id === teacherId);
  if (teacher?.selectedClassId !== removedClassId) return;
  const next = classesFor(data, teacherId)[0];
  if (teacher) teacher.selectedClassId = next?.id ?? null;
}

function studentClass(
  data: LocalData,
  teacherId: string,
  studentId: string,
): Classroom | undefined {
  const student = data.students.find(
    (candidate) => candidate.id === studentId && candidate.teacherId === teacherId,
  );
  if (!student?.classIds.length) return undefined;

  const teacher = data.teachers.find((candidate) => candidate.id === teacherId);
  if (teacher?.selectedClassId && student.classIds.includes(teacher.selectedClassId)) {
    const selected = classById(data, teacherId, teacher.selectedClassId);
    if (selected && selected.archivedAt === null) return toClassroom(selected);
  }

  const classroom = classesFor(data, teacherId).find((candidate) =>
    student.classIds.includes(candidate.id),
  );
  return classroom ? toClassroom(classroom) : undefined;
}

const BEHAVIOR_SEEDS: Array<{
  key: string;
  label: string;
  tone: BehaviorTone;
  icon: string;
}> = [
  { key: "on_task", label: "On task", tone: "positive", icon: "✅" },
  { key: "helping", label: "Helping others", tone: "positive", icon: "🤝" },
  { key: "participating", label: "Participating", tone: "positive", icon: "🙋" },
  { key: "disrespect", label: "Disrespect", tone: "concern", icon: "🗯️" },
  { key: "off_task", label: "Off-task", tone: "concern", icon: "💭" },
  { key: "phone", label: "Phone use", tone: "concern", icon: "📱" },
  { key: "disruption", label: "Disruption", tone: "concern", icon: "🔊" },
  { key: "tardy", label: "Tardy", tone: "concern", icon: "⏰" },
  { key: "unprepared", label: "Unprepared", tone: "concern", icon: "🎒" },
  { key: "other", label: "Other", tone: "neutral", icon: "＋" },
];

function seedTeacher(data: LocalData, teacherId: string) {
  if (!data.behaviors.some((behavior) => behavior.teacherId === teacherId)) {
    data.behaviors.push(
      ...BEHAVIOR_SEEDS.map((behavior, index) => ({
        id: randomUUID(),
        teacherId,
        label: behavior.label,
        tone: behavior.tone,
        icon: behavior.icon,
        active: true,
        system: behavior.key === "other",
        requiresNote: false,
        sortOrder: index,
      })),
    );
  }

  if (!data.settings.some((settings) => settings.teacherId === teacherId)) {
    data.settings.push({
      teacherId,
      showSeverity: false,
      requireOtherNote: true,
      haptics: true,
      warnDuplicates: true,
    });
  }
}

/**
 * Reduce any accepted scan payload to the opaque token or student ID:
 * legacy `ot://student/<token>`, printed `https://host/s/<token>` links,
 * `?code=<token>` links, or a plain ID.
 */
function scannedKey(rawCode: string): string {
  const code = rawCode.trim();
  const legacy = code.match(/^ot:\/\/student\/(.+)$/i);
  if (legacy) return legacy[1].trim();

  if (/^https?:\/\//i.test(code)) {
    try {
      const url = new URL(code);
      const param = url.searchParams.get("code")?.trim();
      if (param) return param;
      const short = url.pathname.match(/^\/s\/([^/]+)\/?$/i);
      if (short) return decodeURIComponent(short[1]).trim();
    } catch {
      // Not a usable URL; fall through and treat it as a raw code.
    }
  }

  return code;
}

/** Health probe; also proves the local data file is writable. */
export async function pingDatabase(): Promise<void> {
  await mutate(() => undefined);
}

export async function ensureTeacher(input: { email: string; name: string }): Promise<Teacher> {
  return mutate((data) => {
    const email = input.email.trim().toLowerCase();
    if (!email) throw new Error("A teacher email is required.");

    let teacher = data.teachers.find((candidate) => candidate.email === email);
    if (!teacher) {
      teacher = {
        id: email,
        email,
        name: input.name,
        selectedClassId: null,
        createdAt: new Date().toISOString(),
      };
      data.teachers.push(teacher);
    } else if (teacher.name !== input.name) {
      teacher.name = input.name;
    }
    seedTeacher(data, email);

    let selectedClassId = teacher.selectedClassId;
    if (!selectedClassId || !classById(data, email, selectedClassId)) {
      selectedClassId = classesFor(data, email)[0]?.id ?? null;
      teacher.selectedClassId = selectedClassId;
    }

    return {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      selectedClassId,
    };
  });
}

export async function getClasses(teacherId: string): Promise<Classroom[]> {
  return read((data) => classesFor(data, teacherId).map(toClassroom));
}

export async function getArchivedClasses(teacherId: string): Promise<Classroom[]> {
  return read((data) => archivedClassesFor(data, teacherId).map(toClassroom));
}

export async function getClass(
  teacherId: string,
  classId: string,
): Promise<Classroom | undefined> {
  return read((data) => {
    const classroom = classById(data, teacherId, classId);
    return classroom && classroom.archivedAt === null ? toClassroom(classroom) : undefined;
  });
}

export async function getSelectedClass(teacherId: string): Promise<Classroom | undefined> {
  return mutate((data) => {
    const teacher = data.teachers.find((candidate) => candidate.id === teacherId);
    if (teacher?.selectedClassId) {
      const selected = classById(data, teacherId, teacher.selectedClassId);
      if (selected && selected.archivedAt === null) return toClassroom(selected);
    }

    const first = classesFor(data, teacherId)[0];
    if (teacher && first) teacher.selectedClassId = first.id;
    return first ? toClassroom(first) : undefined;
  });
}

export async function selectClass(teacherId: string, classId: string): Promise<void> {
  await mutate((data) => {
    const classroom = classById(data, teacherId, classId);
    if (!classroom || classroom.archivedAt !== null) throw new Error("Class not found.");
    const teacher = data.teachers.find((candidate) => candidate.id === teacherId);
    if (teacher) teacher.selectedClassId = classId;
  });
}

export async function createClass(
  teacherId: string,
  input: { name: string; period: string; room: string },
): Promise<Classroom> {
  return mutate((data) => {
    const name = input.name.trim();
    const rawPeriod = input.period.trim();
    if (!name || !rawPeriod) throw new Error("A class name and period are required.");
    const period = /^\d+$/.test(rawPeriod) ? `Period ${rawPeriod}` : rawPeriod;
    const room = input.room.trim() || "TBD";
    const id = randomUUID();
    const color = CLASS_COLORS[classesFor(data, teacherId).length % CLASS_COLORS.length];

    const classroom: LocalClassroom = {
      id,
      teacherId,
      period,
      name,
      room,
      color,
      archivedAt: null,
      createdAt: new Date().toISOString(),
    };
    data.classes.push(classroom);

    const teacher = data.teachers.find((candidate) => candidate.id === teacherId);
    if (teacher) teacher.selectedClassId = id;

    return toClassroom(classroom);
  });
}

export async function updateClass(
  teacherId: string,
  classId: string,
  input: { name: string; period: string; room: string },
): Promise<Classroom> {
  return mutate((data) => {
    const name = input.name.trim();
    const rawPeriod = input.period.trim();
    if (!name || !rawPeriod) throw new Error("A class name and period are required.");
    const period = /^\d+$/.test(rawPeriod) ? `Period ${rawPeriod}` : rawPeriod;
    const room = input.room.trim() || "TBD";

    const classroom = classById(data, teacherId, classId);
    if (!classroom || classroom.archivedAt !== null) throw new Error("Class not found.");

    classroom.name = name;
    classroom.period = period;
    classroom.room = room;
    return toClassroom(classroom);
  });
}

export async function archiveClass(teacherId: string, classId: string): Promise<void> {
  await mutate((data) => {
    const classroom = classById(data, teacherId, classId);
    if (!classroom || classroom.archivedAt !== null) throw new Error("Class not found.");
    classroom.archivedAt = new Date().toISOString();
    selectFallbackClass(data, teacherId, classId);
  });
}

export async function restoreClass(teacherId: string, classId: string): Promise<void> {
  await mutate((data) => {
    const classroom = classById(data, teacherId, classId);
    if (!classroom || classroom.archivedAt === null) {
      throw new Error("Archived class not found.");
    }
    classroom.archivedAt = null;
  });
}

export async function deleteClass(teacherId: string, classId: string): Promise<void> {
  await mutate((data) => {
    const classroom = classById(data, teacherId, classId);
    if (!classroom) throw new Error("Class not found.");

    const affected = data.students.filter(
      (student) => student.teacherId === teacherId && student.classIds.includes(classId),
    );

    data.classes = data.classes.filter(
      (candidate) => !(candidate.id === classId && candidate.teacherId === teacherId),
    );
    for (const student of affected) {
      student.classIds = student.classIds.filter((id) => id !== classId);
    }
    data.incidents = data.incidents.filter(
      (incident) => !(incident.teacherId === teacherId && incident.classId === classId),
    );

    // A student enrolled only in this class no longer belongs to any roster.
    const orphanIds = affected
      .filter((student) => student.classIds.length === 0)
      .map((student) => student.id);
    if (orphanIds.length) {
      data.students = data.students.filter((student) => !orphanIds.includes(student.id));
      data.incidents = data.incidents.filter(
        (incident) =>
          !(incident.teacherId === teacherId && orphanIds.includes(incident.studentId)),
      );
    }

    selectFallbackClass(data, teacherId, classId);
  });
}

export async function getClassCounts(teacherId: string): Promise<Record<string, number>> {
  return read((data) => {
    const counts: Record<string, number> = {};
    for (const student of data.students) {
      if (student.teacherId !== teacherId) continue;
      for (const classId of student.classIds) {
        counts[classId] = (counts[classId] ?? 0) + 1;
      }
    }
    return counts;
  });
}

export async function getRoster(
  teacherId: string,
  classId: string,
  range: DateWindow = { from: startOfDaysAgo(29), to: endOfToday() },
): Promise<RosterStudent[]> {
  return read((data) => {
    const from = range.from.getTime();
    const to = range.to.getTime();
    const students = data.students
      .filter((student) => student.teacherId === teacherId && student.classIds.includes(classId))
      .sort(byName);

    return students.map((student) => {
      const incidents = data.incidents.filter(
        (incident) =>
          incident.teacherId === teacherId &&
          incident.classId === classId &&
          incident.studentId === student.id,
      );

      let entries = 0;
      let positive = 0;
      let concern = 0;
      let lastAt: string | null = null;
      for (const incident of incidents) {
        const at = new Date(incident.occurredAt).getTime();
        if (!lastAt || at > new Date(lastAt).getTime()) lastAt = incident.occurredAt;
        if (at < from || at > to) continue;

        entries++;
        for (const behavior of incident.behaviors) {
          if (behavior.tone === "positive") positive++;
          else if (behavior.tone === "concern") concern++;
        }
      }

      return {
        ...toStudent(student),
        entries,
        positive,
        concern,
        lastAt,
      };
    });
  });
}

export async function getDashboard(
  teacherId: string,
  classroom: Classroom,
): Promise<DashboardData> {
  return read((data) => {
    const today = startOfToday().getTime();
    const matching = data.incidents.filter(
      (incident) => incident.teacherId === teacherId && incident.classId === classroom.id,
    );
    const todayDocs = matching.filter(
      (incident) => new Date(incident.occurredAt).getTime() >= today,
    );
    const latestDocs = [...matching]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5);

    const recent = new Map<string, { count: number; lastAt: string }>();
    for (const incident of todayDocs) {
      const row = recent.get(incident.studentId);
      if (row) {
        row.count++;
        if (new Date(incident.occurredAt).getTime() > new Date(row.lastAt).getTime()) {
          row.lastAt = incident.occurredAt;
        }
      } else {
        recent.set(incident.studentId, { count: 1, lastAt: incident.occurredAt });
      }
    }
    const recentRows = [...recent.entries()]
      .sort((a, b) => new Date(b[1].lastAt).getTime() - new Date(a[1].lastAt).getTime())
      .slice(0, 5);

    let positive = 0;
    let total = 0;
    for (const incident of todayDocs) {
      for (const behavior of incident.behaviors) {
        total++;
        if (behavior.tone === "positive") positive++;
      }
    }

    const studentById = new Map(data.students.map((student) => [student.id, student]));
    const rosterCount = data.students.filter(
      (student) => student.teacherId === teacherId && student.classIds.includes(classroom.id),
    ).length;

    return {
      classroom,
      rosterCount,
      todayEntries: todayDocs.length,
      todayStudents: new Set(todayDocs.map((incident) => incident.studentId)).size,
      positiveShare: total ? Math.round((positive / total) * 100) : 0,
      recentStudents: recentRows.flatMap(([id, row]) => {
        const student = studentById.get(id);
        if (!student) return [];
        return [
          {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            initials:
              `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase(),
            color: student.color,
            count: row.count,
          },
        ];
      }),
      latest: latestDocs.map((incident) => {
        const student = studentById.get(incident.studentId);
        return {
          ...toIncident(incident),
          student: student
            ? toStudent(student)
            : {
                id: incident.studentId,
                firstName: "Unknown",
                lastName: "",
                externalId: "",
                qrToken: "",
                color: "#64748b",
              },
        };
      }),
    };
  });
}

export async function getBehaviors(teacherId: string): Promise<Behavior[]> {
  return read((data) =>
    data.behaviors
      .filter((behavior) => behavior.teacherId === teacherId && behavior.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map(toBehavior),
  );
}

export async function getSettings(teacherId: string) {
  return read((data) => {
    const settings = data.settings.find((candidate) => candidate.teacherId === teacherId);
    return {
      showSeverity: Boolean(settings?.showSeverity ?? false),
      requireOtherNote: Boolean(settings?.requireOtherNote ?? true),
      haptics: Boolean(settings?.haptics ?? true),
      warnDuplicates: Boolean(settings?.warnDuplicates ?? true),
    };
  });
}

export async function isStudentInClass(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<boolean> {
  return read((data) =>
    data.students.some(
      (student) =>
        student.id === studentId &&
        student.teacherId === teacherId &&
        student.classIds.includes(classId),
    ),
  );
}

export async function getStudentClass(
  teacherId: string,
  studentId: string,
): Promise<Classroom | undefined> {
  return read((data) => studentClass(data, teacherId, studentId));
}

export async function createIncident(input: {
  teacherId: string;
  classId: string;
  studentId: string;
  behaviors: Behavior[];
  note: string;
  severity: string | null;
  occurredAt?: string;
}): Promise<string> {
  return mutate((data) => {
    const student = data.students.find(
      (candidate) =>
        candidate.id === input.studentId &&
        candidate.teacherId === input.teacherId &&
        candidate.classIds.includes(input.classId),
    );
    if (!student) throw new Error("Student is not in this class.");
    if (!input.behaviors.length) throw new Error("Choose at least one behavior.");

    const id = randomUUID();
    const now = new Date().toISOString();
    data.incidents.push({
      id,
      teacherId: input.teacherId,
      studentId: input.studentId,
      classId: input.classId,
      occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : now,
      note: input.note,
      severity: input.severity,
      source: "form",
      behaviors: input.behaviors.map((behavior) => ({
        id: behavior.id,
        label: behavior.label,
        tone: behavior.tone,
        icon: behavior.icon,
      })),
      createdAt: now,
    });
    return id;
  });
}

export async function addStudentsBulk(
  teacherId: string,
  classId: string,
  rows: BulkStudentRow[],
): Promise<{ added: number; enrolled: number; skipped: number }> {
  return mutate((data) => {
    const classroom = classById(data, teacherId, classId);
    if (!classroom || classroom.archivedAt !== null) throw new Error("Class not found.");

    let added = 0;
    let enrolled = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const row of rows) {
      if (row.error) {
        skipped++;
        continue;
      }

      const externalId = row.externalId.trim();
      const externalIdLower = externalId.toLowerCase();
      const existing = data.students.find(
        (student) =>
          student.teacherId === teacherId && student.externalIdLower === externalIdLower,
      );

      if (existing) {
        if (existing.classIds.includes(classId)) {
          skipped++;
        } else {
          existing.classIds.push(classId);
          enrolled++;
        }
        continue;
      }

      data.students.push({
        id: randomUUID(),
        teacherId,
        firstName: row.firstName,
        lastName: row.lastName,
        externalId,
        externalIdLower,
        qrToken: newQrToken(),
        color: STUDENT_COLORS[Math.floor(Math.random() * STUDENT_COLORS.length)],
        classIds: [classId],
        createdAt: now,
      });
      added++;
    }

    return { added, enrolled, skipped };
  });
}

export async function addStudent(
  teacherId: string,
  classId: string,
  input: { firstName: string; lastName: string; externalId: string },
) {
  return addStudentsBulk(teacherId, classId, [
    {
      line: 1,
      raw: "",
      firstName: input.firstName,
      lastName: input.lastName,
      externalId: input.externalId,
    },
  ]);
}

export async function getStudent(
  teacherId: string,
  studentId: string,
): Promise<Student | undefined> {
  return read((data) => {
    const student = data.students.find(
      (candidate) => candidate.id === studentId && candidate.teacherId === teacherId,
    );
    return student ? toStudent(student) : undefined;
  });
}

export async function updateStudent(
  teacherId: string,
  studentId: string,
  input: { firstName: string; lastName: string; externalId: string },
): Promise<Student> {
  return mutate((data) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const externalId = input.externalId.trim();
    if (!firstName || !lastName || !externalId) {
      throw new Error("A first name, last name, and student ID are required.");
    }

    const externalIdLower = externalId.toLowerCase();
    const duplicate = data.students.find(
      (student) =>
        student.teacherId === teacherId &&
        student.externalIdLower === externalIdLower &&
        student.id !== studentId,
    );
    if (duplicate) throw new Error("That student ID is already used by another student.");

    const student = data.students.find(
      (candidate) => candidate.id === studentId && candidate.teacherId === teacherId,
    );
    if (!student) throw new Error("Student not found.");

    student.firstName = firstName;
    student.lastName = lastName;
    student.externalId = externalId;
    student.externalIdLower = externalIdLower;
    return toStudent(student);
  });
}

export async function removeStudentFromClass(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<void> {
  await mutate((data) => {
    const student = data.students.find(
      (candidate) => candidate.id === studentId && candidate.teacherId === teacherId,
    );
    if (!student) throw new Error("Student not found.");
    if (!student.classIds.includes(classId)) throw new Error("Student is not in this class.");

    const remaining = student.classIds.filter((id) => id !== classId);
    if (remaining.length) {
      student.classIds = remaining;
      return;
    }

    data.students = data.students.filter((candidate) => candidate.id !== studentId);
    data.incidents = data.incidents.filter(
      (incident) => !(incident.teacherId === teacherId && incident.studentId === studentId),
    );
  });
}

export async function resolveScannedStudent(
  teacherId: string,
  rawCode: string,
): Promise<{ student: Student; classroom: Classroom } | null> {
  return mutate((data) => {
    const key = scannedKey(rawCode);
    if (!key) return null;

    const student = data.students.find(
      (candidate) =>
        candidate.teacherId === teacherId &&
        (candidate.qrToken === key ||
          candidate.externalIdLower === key.toLowerCase()),
    );
    if (!student) return null;

    const classroom = studentClass(data, teacherId, student.id);
    if (!classroom) return null;

    const teacher = data.teachers.find((candidate) => candidate.id === teacherId);
    if (teacher && teacher.selectedClassId !== classroom.id) {
      teacher.selectedClassId = classroom.id;
    }

    return { student: toStudent(student), classroom };
  });
}

export async function getStudentHistory(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<Incident[]> {
  return read((data) =>
    data.incidents
      .filter(
        (incident) =>
          incident.teacherId === teacherId &&
          incident.classId === classId &&
          incident.studentId === studentId,
      )
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 10)
      .map(toIncident),
  );
}

export async function getReport(
  teacherId: string,
  classId: string,
  range: DateWindow,
): Promise<ReportData> {
  return read((data) => {
    const from = range.from.getTime();
    const to = range.to.getTime();
    const incidents = data.incidents.filter(
      (incident) =>
        incident.teacherId === teacherId &&
        incident.classId === classId &&
        new Date(incident.occurredAt).getTime() >= from &&
        new Date(incident.occurredAt).getTime() <= to,
    );

    const behaviorRows = new Map<
      string,
      { label: string; tone: BehaviorTone; count: number; students: Map<string, number> }
    >();
    const studentCounts = new Map<string, number>();
    let positive = 0;
    let total = 0;

    for (const incident of incidents) {
      for (const behavior of incident.behaviors) {
        total++;
        if (behavior.tone === "positive") positive++;

        const key = `${behavior.tone}\u0000${behavior.label}`;
        const row = behaviorRows.get(key) ?? {
          label: behavior.label,
          tone: behavior.tone,
          count: 0,
          students: new Map<string, number>(),
        };
        row.count++;
        row.students.set(
          incident.studentId,
          (row.students.get(incident.studentId) ?? 0) + 1,
        );
        behaviorRows.set(key, row);
      }

      studentCounts.set(
        incident.studentId,
        (studentCounts.get(incident.studentId) ?? 0) + 1,
      );
    }

    const studentById = new Map(
      data.students
        .filter((student) => student.teacherId === teacherId)
        .map((student) => [student.id, student]),
    );

    const behaviorList = [...behaviorRows.values()]
      .map((row) => ({
        label: row.label,
        tone: row.tone,
        count: row.count,
        students: [...row.students.entries()]
          .flatMap(([id, count]) => {
            const student = studentById.get(id);
            return student
              ? [{ id, name: `${student.firstName} ${student.lastName}`, count }]
              : [];
          })
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const studentList = [...studentCounts.entries()]
      .flatMap(([id, count]) => {
        const student = studentById.get(id);
        return student ? [{ ...toStudent(student), count }] : [];
      })
      .sort((a, b) => b.count - a.count || byName(a, b));

    return {
      entries: incidents.length,
      students: studentCounts.size,
      positiveShare: total ? Math.round((positive / total) * 100) : 0,
      behaviors: behaviorList,
      studentRows: studentList,
    };
  });
}

export async function getStats(teacherId: string) {
  return read((data) => ({
    classes: data.classes.filter(
      (classroom) => classroom.teacherId === teacherId && classroom.archivedAt === null,
    ).length,
    students: data.students.filter((student) => student.teacherId === teacherId).length,
    incidents: data.incidents.filter((incident) => incident.teacherId === teacherId).length,
  }));
}
