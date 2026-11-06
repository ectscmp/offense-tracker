import { randomUUID } from "node:crypto";
import { MongoClient, MongoServerError, type Collection, type Db } from "mongodb";
import type {
  Behavior,
  BehaviorTone,
  Classroom,
  DashboardData,
  Incident,
  RosterStudent,
  Student,
  Teacher,
} from "./types";
import { nameOf, startOfDaysAgo, startOfToday } from "./format";
import type { BulkStudentRow } from "./parse-students";

/*
 * MongoDB persistence (Railway app + MongoDB Atlas cluster).
 *
 * Everything lives behind this module so pages and server actions never touch
 * the driver directly. The connection is created lazily on the first request so
 * `next build` can collect route metadata without a database.
 *
 * Collections:
 *   teachers   profile + currently selected class
 *   classes    teacher-owned classrooms
 *   students   teacher-owned students; `classIds` embeds class membership
 *   behaviors  per-teacher behavior vocabulary
 *   incidents  one document per entry; `behaviors` is a denormalized snapshot
 *   settings   per-teacher form preferences
 */

const uri = process.env.MONGODB_URI?.trim() ?? "";
const dbName = process.env.MONGODB_DB?.trim() || "offense_tracker";

type TeacherDoc = {
  _id: string;
  email: string;
  name: string;
  selectedClassId: string | null;
  createdAt: Date;
};

type ClassDoc = {
  _id: string;
  teacherId: string;
  period: string;
  name: string;
  room: string;
  color: string;
  archivedAt: Date | null;
  createdAt: Date;
};

type StudentDoc = {
  _id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  externalId: string;
  externalIdLower: string;
  qrToken: string;
  color: string;
  classIds: string[];
  createdAt: Date;
};

type BehaviorDoc = {
  _id: string;
  teacherId: string;
  label: string;
  tone: BehaviorTone;
  icon: string;
  active: boolean;
  system: boolean;
  requiresNote: boolean;
  sortOrder: number;
};

type IncidentBehaviorDoc = {
  id: string;
  label: string;
  tone: BehaviorTone;
  icon: string;
};

type IncidentDoc = {
  _id: string;
  teacherId: string;
  studentId: string;
  classId: string;
  occurredAt: Date;
  note: string;
  severity: string | null;
  source: string;
  behaviors: IncidentBehaviorDoc[];
  createdAt: Date;
};

type SettingsDoc = {
  _id: string;
  teacherId: string;
  showSeverity: boolean;
  requireOtherNote: boolean;
  haptics: boolean;
  warnDuplicates: boolean;
};

type Collections = {
  teachers: Collection<TeacherDoc>;
  classes: Collection<ClassDoc>;
  students: Collection<StudentDoc>;
  behaviors: Collection<BehaviorDoc>;
  incidents: Collection<IncidentDoc>;
  settings: Collection<SettingsDoc>;
};

type Connection = Collections & { db: Db };

const globalForMongo = globalThis as unknown as {
  __offenseMongo?: Promise<Connection>;
};

function connect(): Promise<Connection> {
  if (!uri) {
    return Promise.reject(
      new Error(
        "MONGODB_URI is not set. Copy web/.env.example to web/.env.local and add your MongoDB connection string.",
      ),
    );
  }
  if (!globalForMongo.__offenseMongo) {
    globalForMongo.__offenseMongo = (async () => {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const db = client.db(dbName);
      await ensureIndexes(db);
      return { db, ...collections(db) };
    })();
    // A failed first connection should not be cached forever.
    globalForMongo.__offenseMongo.catch(() => {
      globalForMongo.__offenseMongo = undefined;
    });
  }
  return globalForMongo.__offenseMongo;
}

function collections(db: Db): Collections {
  return {
    teachers: db.collection<TeacherDoc>("teachers"),
    classes: db.collection<ClassDoc>("classes"),
    students: db.collection<StudentDoc>("students"),
    behaviors: db.collection<BehaviorDoc>("behaviors"),
    incidents: db.collection<IncidentDoc>("incidents"),
    settings: db.collection<SettingsDoc>("settings"),
  };
}

async function ensureIndexes(db: Db) {
  const { teachers, classes, students, behaviors, incidents } = collections(db);
  await Promise.all([
    teachers.createIndex({ email: 1 }, { unique: true }),
    classes.createIndex({ teacherId: 1, createdAt: 1 }),
    students.createIndex({ teacherId: 1, externalIdLower: 1 }, { unique: true }),
    students.createIndex({ qrToken: 1 }, { unique: true }),
    students.createIndex({ teacherId: 1, classIds: 1 }),
    behaviors.createIndex({ teacherId: 1, sortOrder: 1 }),
    incidents.createIndex({ teacherId: 1, classId: 1, occurredAt: -1 }),
    incidents.createIndex({ teacherId: 1, studentId: 1, occurredAt: -1 }),
  ]);
}

/** Health probe for the Railway healthcheck. */
export async function pingDatabase(): Promise<void> {
  const { db } = await connect();
  await db.command({ ping: 1 });
}

function newQrToken() {
  return randomUUID().replaceAll("-", "");
}

const CLASS_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];
const STUDENT_COLORS = ["#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

function isDuplicateKey(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

function byName(a: { lastName: string; firstName: string }, b: { lastName: string; firstName: string }) {
  const last = a.lastName.localeCompare(b.lastName, "en", { sensitivity: "base" });
  if (last !== 0) return last;
  return a.firstName.localeCompare(b.firstName, "en", { sensitivity: "base" });
}

function mapClass(doc: ClassDoc): Classroom {
  return {
    id: doc._id,
    teacherId: doc.teacherId,
    period: doc.period,
    name: doc.name,
    room: doc.room,
    color: doc.color,
    archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
  };
}

function mapStudent(doc: StudentDoc): Student {
  return {
    id: doc._id,
    firstName: doc.firstName,
    lastName: doc.lastName,
    externalId: doc.externalId,
    qrToken: doc.qrToken || "",
    color: doc.color,
  };
}

function mapBehavior(doc: BehaviorDoc): Behavior {
  return {
    id: doc._id,
    label: doc.label,
    tone: doc.tone,
    icon: doc.icon,
    system: doc.system,
    requiresNote: doc.requiresNote,
  };
}

function mapIncident(doc: IncidentDoc): Incident {
  return {
    id: doc._id,
    studentId: doc.studentId,
    classId: doc.classId,
    occurredAt: doc.occurredAt.toISOString(),
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

async function positiveShare(match: Record<string, unknown>): Promise<number> {
  const { incidents } = await connect();
  const [row] = await incidents
    .aggregate<{ positive: number; total: number }>([
      { $match: match },
      { $unwind: "$behaviors" },
      {
        $group: {
          _id: null,
          positive: { $sum: { $cond: [{ $eq: ["$behaviors.tone", "positive"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ])
    .toArray();
  return row?.total ? Math.round((Number(row.positive) / Number(row.total)) * 100) : 0;
}

export async function ensureTeacher(input: { email: string; name: string }): Promise<Teacher> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("A teacher email is required.");
  const { teachers, settings } = await connect();
  const now = new Date();

  try {
    await teachers.insertOne({
      _id: email,
      email,
      name: input.name,
      selectedClassId: null,
      createdAt: now,
    });
    await seedTeacher(email);
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const existing = await teachers.findOne({ _id: email });
    if (existing && existing.name !== input.name) {
      await teachers.updateOne({ _id: email }, { $set: { name: input.name } });
    }
    // Recover from a first-run seed that stopped part way through. Settings are
    // written last, so their presence means the defaults were fully seeded.
    const defaults = await settings.findOne({ _id: email });
    if (!defaults) await seedTeacher(email);
  }

  const teacher = await teachers.findOne({ _id: email });
  if (!teacher) throw new Error("Could not create teacher.");

  let selectedClassId = teacher.selectedClassId;
  if (!selectedClassId || !(await getClass(email, selectedClassId))) {
    const first = (await getClasses(email))[0];
    selectedClassId = first?.id ?? null;
    if (selectedClassId !== teacher.selectedClassId) {
      await teachers.updateOne({ _id: email }, { $set: { selectedClassId } });
    }
  }

  return {
    id: teacher._id,
    email: teacher.email,
    name: teacher.name,
    selectedClassId,
  };
}

export async function getClasses(teacherId: string): Promise<Classroom[]> {
  const { classes } = await connect();
  const docs = await classes
    .find({ teacherId, archivedAt: null })
    .sort({ createdAt: 1, period: 1 })
    .toArray();
  return docs.map(mapClass);
}

export async function getArchivedClasses(teacherId: string): Promise<Classroom[]> {
  const { classes } = await connect();
  const docs = await classes
    .find({ teacherId, archivedAt: { $exists: true, $ne: null } })
    .sort({ archivedAt: -1 })
    .toArray();
  return docs.map(mapClass);
}

export async function getClass(teacherId: string, classId: string): Promise<Classroom | undefined> {
  const { classes } = await connect();
  const doc = await classes.findOne({ _id: classId, teacherId, archivedAt: null });
  return doc ? mapClass(doc) : undefined;
}

export async function getSelectedClass(teacherId: string): Promise<Classroom | undefined> {
  const { teachers } = await connect();
  const teacher = await teachers.findOne({ _id: teacherId }, { projection: { selectedClassId: 1 } });
  if (teacher?.selectedClassId) {
    const selected = await getClass(teacherId, teacher.selectedClassId);
    if (selected) return selected;
  }
  const first = (await getClasses(teacherId))[0];
  if (first) {
    await teachers.updateOne({ _id: teacherId }, { $set: { selectedClassId: first.id } });
  }
  return first;
}

export async function selectClass(teacherId: string, classId: string): Promise<void> {
  if (!(await getClass(teacherId, classId))) throw new Error("Class not found.");
  const { teachers } = await connect();
  await teachers.updateOne({ _id: teacherId }, { $set: { selectedClassId: classId } });
}

export async function createClass(
  teacherId: string,
  input: { name: string; period: string; room: string },
): Promise<Classroom> {
  const name = input.name.trim();
  const rawPeriod = input.period.trim();
  if (!name || !rawPeriod) throw new Error("A class name and period are required.");
  const period = /^\d+$/.test(rawPeriod) ? `Period ${rawPeriod}` : rawPeriod;
  const room = input.room.trim() || "TBD";
  const id = randomUUID();
  const color = CLASS_COLORS[(await getClasses(teacherId)).length % CLASS_COLORS.length];

  const { classes, teachers } = await connect();
  const doc: ClassDoc = {
    _id: id,
    teacherId,
    period,
    name,
    room,
    color,
    archivedAt: null,
    createdAt: new Date(),
  };
  await classes.insertOne(doc);
  await teachers.updateOne({ _id: teacherId }, { $set: { selectedClassId: id } });
  return mapClass(doc);
}

export async function updateClass(
  teacherId: string,
  classId: string,
  input: { name: string; period: string; room: string },
): Promise<Classroom> {
  const name = input.name.trim();
  const rawPeriod = input.period.trim();
  if (!name || !rawPeriod) throw new Error("A class name and period are required.");
  const period = /^\d+$/.test(rawPeriod) ? `Period ${rawPeriod}` : rawPeriod;
  const room = input.room.trim() || "TBD";

  const { classes } = await connect();
  const result = await classes.updateOne(
    { _id: classId, teacherId, archivedAt: null },
    { $set: { name, period, room } },
  );
  if (!result.matchedCount) throw new Error("Class not found.");

  const updated = await classes.findOne({ _id: classId, teacherId });
  if (!updated) throw new Error("Class not found.");
  return mapClass(updated);
}

async function selectFallbackClass(teacherId: string, removedClassId: string) {
  const { teachers } = await connect();
  const teacher = await teachers.findOne(
    { _id: teacherId },
    { projection: { selectedClassId: 1 } },
  );
  if (teacher?.selectedClassId !== removedClassId) return;

  const next = (await getClasses(teacherId))[0];
  await teachers.updateOne(
    { _id: teacherId },
    { $set: { selectedClassId: next?.id ?? null } },
  );
}

export async function archiveClass(teacherId: string, classId: string): Promise<void> {
  const { classes } = await connect();
  const result = await classes.updateOne(
    { _id: classId, teacherId, archivedAt: null },
    { $set: { archivedAt: new Date() } },
  );
  if (!result.matchedCount) throw new Error("Class not found.");
  await selectFallbackClass(teacherId, classId);
}

export async function restoreClass(teacherId: string, classId: string): Promise<void> {
  const { classes } = await connect();
  const result = await classes.updateOne(
    { _id: classId, teacherId, archivedAt: { $ne: null } },
    { $set: { archivedAt: null } },
  );
  if (!result.matchedCount) throw new Error("Archived class not found.");
}

export async function deleteClass(teacherId: string, classId: string): Promise<void> {
  const { classes, students, incidents } = await connect();
  const doc = await classes.findOne({ _id: classId, teacherId });
  if (!doc) throw new Error("Class not found.");

  const affected = await students
    .find({ teacherId, classIds: classId }, { projection: { _id: 1 } })
    .toArray();

  await Promise.all([
    classes.deleteOne({ _id: classId, teacherId }),
    students.updateMany({ teacherId, classIds: classId }, { $pull: { classIds: classId } }),
    incidents.deleteMany({ teacherId, classId }),
  ]);

  // A student enrolled only in this class no longer belongs to any roster.
  const affectedIds = affected.map((student) => student._id);
  if (affectedIds.length) {
    const orphans = await students
      .find(
        { _id: { $in: affectedIds }, teacherId, classIds: { $size: 0 } },
        { projection: { _id: 1 } },
      )
      .toArray();
    const orphanIds = orphans.map((student) => student._id);
    if (orphanIds.length) {
      await incidents.deleteMany({ teacherId, studentId: { $in: orphanIds } });
      await students.deleteMany({ _id: { $in: orphanIds }, teacherId });
    }
  }

  await selectFallbackClass(teacherId, classId);
}

export async function getClassCounts(teacherId: string): Promise<Record<string, number>> {
  const { students } = await connect();
  const rows = await students
    .aggregate<{ _id: string; count: number }>([
      { $match: { teacherId } },
      { $unwind: "$classIds" },
      { $group: { _id: "$classIds", count: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((row) => [row._id, Number(row.count)]));
}

export async function getRoster(teacherId: string, classId: string): Promise<RosterStudent[]> {
  const { students, incidents } = await connect();
  const since = startOfDaysAgo(30);
  const docs = await students.find({ teacherId, classIds: classId }).toArray();
  docs.sort(byName);

  const ids = docs.map((doc) => doc._id);
  const activity = ids.length
    ? await incidents
        .aggregate<{
          _id: string;
          logs30d: number;
          positive30d: number;
          concern30d: number;
          lastAt: Date;
        }>([
          {
            $match: {
              teacherId,
              classId,
              studentId: { $in: ids },
              occurredAt: { $gte: since },
            },
          },
          {
            $project: {
              occurredAt: 1,
              positive: {
                $size: {
                  $filter: {
                    input: "$behaviors",
                    as: "behavior",
                    cond: { $eq: ["$$behavior.tone", "positive"] },
                  },
                },
              },
              concern: {
                $size: {
                  $filter: {
                    input: "$behaviors",
                    as: "behavior",
                    cond: { $eq: ["$$behavior.tone", "concern"] },
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: "$studentId",
              logs30d: { $sum: 1 },
              positive30d: { $sum: "$positive" },
              concern30d: { $sum: "$concern" },
              lastAt: { $max: "$occurredAt" },
            },
          },
        ])
        .toArray()
    : [];
  const byStudent = new Map(activity.map((row) => [row._id, row]));

  return docs.map((doc) => {
    const row = byStudent.get(doc._id);
    return {
      ...mapStudent(doc),
      logs30d: Number(row?.logs30d ?? 0),
      positive30d: Number(row?.positive30d ?? 0),
      concern30d: Number(row?.concern30d ?? 0),
      lastAt: row?.lastAt ? row.lastAt.toISOString() : null,
    };
  });
}

export async function getDashboard(teacherId: string, classroom: Classroom): Promise<DashboardData> {
  const { students, incidents } = await connect();
  const today = startOfToday();
  const match = { teacherId, classId: classroom.id };

  const [rosterCount, todayDocs, latestDocs, recentRows, share] = await Promise.all([
    students.countDocuments({ teacherId, classIds: classroom.id }),
    incidents.find({ ...match, occurredAt: { $gte: today } }).sort({ occurredAt: -1 }).toArray(),
    incidents.find(match).sort({ occurredAt: -1 }).limit(5).toArray(),
    incidents
      .aggregate<{ _id: string; count: number; lastAt: Date }>([
        { $match: { ...match, occurredAt: { $gte: today } } },
        {
          $group: {
            _id: "$studentId",
            count: { $sum: 1 },
            lastAt: { $max: "$occurredAt" },
          },
        },
        { $sort: { lastAt: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    positiveShare({ ...match, occurredAt: { $gte: today } }),
  ]);

  const todayIncidents = todayDocs.map(mapIncident);
  const latest = latestDocs.map(mapIncident);

  const studentIds = new Set<string>([
    ...recentRows.map((row) => row._id),
    ...latest.map((incident) => incident.studentId),
  ]);
  const studentDocs = studentIds.size
    ? await students.find({ _id: { $in: [...studentIds] }, teacherId }).toArray()
    : [];
  const studentById = new Map(studentDocs.map((doc) => [doc._id, doc]));

  return {
    classroom,
    rosterCount,
    todayEntries: todayIncidents.length,
    todayStudents: new Set(todayIncidents.map((incident) => incident.studentId)).size,
    positiveShare: share,
    recentStudents: recentRows.flatMap((row) => {
      const student = studentById.get(row._id);
      if (!student) return [];
      return [
        {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          initials: `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase(),
          color: student.color,
          count: Number(row.count),
        },
      ];
    }),
    latest: latest.map((incident) => {
      const student = studentById.get(incident.studentId);
      return {
        ...incident,
        student: student
          ? mapStudent(student)
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
}

export async function getBehaviors(teacherId: string): Promise<Behavior[]> {
  const { behaviors } = await connect();
  const docs = await behaviors
    .find({ teacherId, active: true })
    .sort({ sortOrder: 1, label: 1 })
    .toArray();
  return docs.map(mapBehavior);
}

export async function getSettings(teacherId: string) {
  const { settings } = await connect();
  const doc = await settings.findOne({ _id: teacherId });

  return {
    showSeverity: Boolean(doc?.showSeverity ?? false),
    requireOtherNote: Boolean(doc?.requireOtherNote ?? true),
    haptics: Boolean(doc?.haptics ?? true),
    warnDuplicates: Boolean(doc?.warnDuplicates ?? true),
  };
}

export async function isStudentInClass(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<boolean> {
  const { students } = await connect();
  const count = await students.countDocuments({ _id: studentId, teacherId, classIds: classId });
  return count > 0;
}

export async function getStudentClass(
  teacherId: string,
  studentId: string,
): Promise<Classroom | undefined> {
  const { students } = await connect();
  const student = await students.findOne(
    { _id: studentId, teacherId },
    { projection: { classIds: 1 } },
  );
  if (!student?.classIds?.length) return undefined;

  const selected = await getSelectedClass(teacherId);
  if (selected && student.classIds.includes(selected.id)) return selected;

  const classes = await getClasses(teacherId);
  return classes.find((candidate) => student.classIds.includes(candidate.id));
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
  if (!(await isStudentInClass(input.teacherId, input.classId, input.studentId))) {
    throw new Error("Student is not in this class.");
  }
  if (!input.behaviors.length) throw new Error("Choose at least one behavior.");

  const { incidents } = await connect();
  const id = randomUUID();
  const now = new Date();

  await incidents.insertOne({
    _id: id,
    teacherId: input.teacherId,
    studentId: input.studentId,
    classId: input.classId,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : now,
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
}

export async function addStudentsBulk(
  teacherId: string,
  classId: string,
  rows: BulkStudentRow[],
): Promise<{ added: number; enrolled: number; skipped: number }> {
  if (!(await getClass(teacherId, classId))) throw new Error("Class not found.");

  const { students } = await connect();
  const now = new Date();
  let added = 0;
  let enrolled = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.error) {
      skipped++;
      continue;
    }

    const externalIdLower = row.externalId.trim().toLowerCase();
    const existing = await students.findOne({ teacherId, externalIdLower });
    if (existing) {
      if (existing.classIds.includes(classId)) {
        skipped++;
      } else {
        await students.updateOne({ _id: existing._id }, { $addToSet: { classIds: classId } });
        enrolled++;
      }
      continue;
    }

    try {
      await students.insertOne({
        _id: randomUUID(),
        teacherId,
        firstName: row.firstName,
        lastName: row.lastName,
        externalId: row.externalId.trim(),
        externalIdLower,
        qrToken: newQrToken(),
        color: STUDENT_COLORS[Math.floor(Math.random() * STUDENT_COLORS.length)],
        classIds: [classId],
        createdAt: now,
      });
      added++;
    } catch (error) {
      // Another request inserted the same student between the lookup and here.
      if (!isDuplicateKey(error)) throw error;
      const raced = await students.findOne({ teacherId, externalIdLower });
      if (raced && !raced.classIds.includes(classId)) {
        await students.updateOne({ _id: raced._id }, { $addToSet: { classIds: classId } });
        enrolled++;
      } else {
        skipped++;
      }
    }
  }

  return { added, enrolled, skipped };
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

export async function getStudent(teacherId: string, studentId: string): Promise<Student | undefined> {
  const { students } = await connect();
  const doc = await students.findOne({ _id: studentId, teacherId });
  return doc ? mapStudent(doc) : undefined;
}

export async function updateStudent(
  teacherId: string,
  studentId: string,
  input: { firstName: string; lastName: string; externalId: string },
): Promise<Student> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const externalId = input.externalId.trim();
  if (!firstName || !lastName || !externalId) {
    throw new Error("A first name, last name, and student ID are required.");
  }

  const { students } = await connect();
  const externalIdLower = externalId.toLowerCase();
  const duplicate = await students.findOne({
    teacherId,
    externalIdLower,
    _id: { $ne: studentId },
  });
  if (duplicate) throw new Error("That student ID is already used by another student.");

  try {
    const result = await students.updateOne(
      { _id: studentId, teacherId },
      { $set: { firstName, lastName, externalId, externalIdLower } },
    );
    if (!result.matchedCount) throw new Error("Student not found.");
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new Error("That student ID is already used by another student.");
    }
    throw error;
  }

  const updated = await students.findOne({ _id: studentId, teacherId });
  if (!updated) throw new Error("Student not found.");
  return mapStudent(updated);
}

export async function removeStudentFromClass(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<void> {
  const { students, incidents } = await connect();
  const student = await students.findOne({ _id: studentId, teacherId });
  if (!student) throw new Error("Student not found.");
  if (!student.classIds.includes(classId)) throw new Error("Student is not in this class.");

  const remaining = student.classIds.filter((id) => id !== classId);
  if (remaining.length) {
    await students.updateOne(
      { _id: studentId, teacherId },
      { $set: { classIds: remaining } },
    );
    return;
  }

  await students.deleteOne({ _id: studentId, teacherId });
  await incidents.deleteMany({ teacherId, studentId });
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

export async function resolveScannedStudent(
  teacherId: string,
  rawCode: string,
): Promise<{ student: Student; classroom: Classroom } | null> {
  const key = scannedKey(rawCode);
  if (!key) return null;

  const { students } = await connect();
  const doc = await students.findOne({
    teacherId,
    $or: [{ qrToken: key }, { externalIdLower: key.toLowerCase() }],
  });
  if (!doc) return null;

  const classroom = await getStudentClass(teacherId, doc._id);
  if (!classroom) return null;

  const selected = await getSelectedClass(teacherId);
  if (selected?.id !== classroom.id) await selectClass(teacherId, classroom.id);

  return { student: mapStudent(doc), classroom };
}

export async function getStudentHistory(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<Incident[]> {
  const { incidents } = await connect();
  const docs = await incidents
    .find({ teacherId, classId, studentId })
    .sort({ occurredAt: -1 })
    .limit(10)
    .toArray();
  return docs.map(mapIncident);
}

export async function getReport(teacherId: string, classId: string, days: number) {
  const { students, incidents } = await connect();
  const since = startOfDaysAgo(Math.max(1, days) - 1);
  const match = { teacherId, classId, occurredAt: { $gte: since } };

  const [summaryRow, behaviorRows, studentRows, share] = await Promise.all([
    incidents
      .aggregate<{ entries: number; students: string[] }>([
        { $match: match },
        {
          $group: {
            _id: null,
            entries: { $sum: 1 },
            students: { $addToSet: "$studentId" },
          },
        },
      ])
      .toArray()
      .then((rows) => rows[0]),
    incidents
      .aggregate<{ _id: { label: string; tone: BehaviorTone }; count: number }>([
        { $match: match },
        { $unwind: "$behaviors" },
        {
          $group: {
            _id: { label: "$behaviors.label", tone: "$behaviors.tone" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, "_id.label": 1 } },
      ])
      .toArray(),
    incidents
      .aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: "$studentId", count: { $sum: 1 } } },
      ])
      .toArray(),
    positiveShare(match),
  ]);

  const studentDocs = studentRows.length
    ? await students.find({ _id: { $in: studentRows.map((row) => row._id) }, teacherId }).toArray()
    : [];
  const studentById = new Map(studentDocs.map((doc) => [doc._id, doc]));

  const behaviorList = behaviorRows.map((row) => ({
    label: row._id.label,
    tone: row._id.tone,
    count: Number(row.count),
  }));

  const studentList = studentRows.flatMap((row) => {
    const doc = studentById.get(row._id);
    if (!doc) return [];
    return [{ ...mapStudent(doc), count: Number(row.count) }];
  });
  studentList.sort((a, b) => b.count - a.count || byName(a, b));

  return {
    entries: Number(summaryRow?.entries ?? 0),
    students: summaryRow?.students?.length ?? 0,
    positiveShare: share,
    behaviors: behaviorList,
    studentRows: studentList,
  };
}

export async function getStats(teacherId: string) {
  const { classes, students, incidents } = await connect();
  const [classCount, studentCount, incidentCount] = await Promise.all([
    classes.countDocuments({ teacherId, archivedAt: null }),
    students.countDocuments({ teacherId }),
    incidents.countDocuments({ teacherId }),
  ]);
  return {
    classes: classCount,
    students: studentCount,
    incidents: incidentCount,
  };
}

/** Default behavior vocabulary created for every new teacher. */
async function seedTeacher(teacherId: string) {
  const { behaviors, settings } = await connect();

  const behaviorSeeds: Array<{ key: string; label: string; tone: BehaviorTone; icon: string }> = [
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

  const behaviorDocs: BehaviorDoc[] = behaviorSeeds.map((behavior, index) => ({
    _id: randomUUID(),
    teacherId,
    label: behavior.label,
    tone: behavior.tone,
    icon: behavior.icon,
    active: true,
    system: behavior.key === "other",
    requiresNote: false,
    sortOrder: index,
  }));
  await behaviors.insertMany(behaviorDocs);

  // Settings are written last: their presence marks the seed as complete.
  await settings.insertOne({
    _id: teacherId,
    teacherId,
    showSeverity: false,
    requireOtherNote: true,
    haptics: true,
    warnDuplicates: true,
  });
}

export function teacherDisplayName(teacher: Teacher) {
  return teacher.name || teacher.email;
}

export function studentName(student: Student) {
  return nameOf(student);
}
