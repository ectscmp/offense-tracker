export type BehaviorTone = "positive" | "concern" | "neutral";

export type Classroom = {
  id: string;
  teacherId: string;
  period: string;
  name: string;
  room: string;
  color: string;
  archivedAt: string | null;
};

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string;
  qrToken: string;
  color: string;
};

export type RosterStudent = Student & {
  /** Entries inside the selected date range. */
  entries: number;
  positive: number;
  concern: number;
  /** Most recent entry of all time, shown even outside the selected range. */
  lastAt: string | null;
};

export type Behavior = {
  id: string;
  label: string;
  tone: BehaviorTone;
  icon: string;
  system: boolean;
  requiresNote: boolean;
};

export type IncidentBehavior = {
  id: string;
  label: string;
  tone: BehaviorTone;
  icon: string;
};

export type Incident = {
  id: string;
  studentId: string;
  classId: string;
  occurredAt: string;
  note: string;
  severity: string | null;
  source: string;
  behaviors: IncidentBehavior[];
};

/** Inclusive local-time window used by reports and roster counts. */
export type DateWindow = {
  from: Date;
  to: Date;
};

export type ReportBehaviorStudent = {
  id: string;
  name: string;
  count: number;
};

export type ReportBehaviorRow = {
  label: string;
  tone: BehaviorTone;
  count: number;
  students: ReportBehaviorStudent[];
};

export type ReportStudentRow = Student & { count: number };

export type ReportData = {
  entries: number;
  students: number;
  positiveShare: number;
  behaviors: ReportBehaviorRow[];
  studentRows: ReportStudentRow[];
};

export type DashboardData = {
  classroom: Classroom;
  rosterCount: number;
  todayEntries: number;
  todayStudents: number;
  positiveShare: number;
  recentStudents: Array<{ id: string; name: string; initials: string; color: string; count: number }>;
  latest: Array<Incident & { student: Student }>;
};

export type Teacher = {
  id: string;
  email: string;
  name: string;
  selectedClassId: string | null;
};
