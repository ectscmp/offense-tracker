export type BehaviorTone = "positive" | "concern" | "neutral";

export type Classroom = {
  id: string;
  teacherId: string;
  period: string;
  name: string;
  room: string;
  color: string;
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
  logs30d: number;
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
