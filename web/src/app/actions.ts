"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addStudentsBulk,
  archiveClass,
  createClass,
  createIncident,
  deleteClass,
  getBehaviors,
  getSettings,
  isStudentInClass,
  removeStudentFromClass,
  resolveScannedStudent,
  restoreClass,
  selectClass,
  updateClass,
  updateStudent,
} from "@/lib/store";
import { classLabel } from "@/lib/format";
import { parseBulkStudents } from "@/lib/parse-students";
import { getCurrentTeacher } from "@/lib/session";

export async function createClassAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  if (!name || !period) redirect("/classes/new?error=missing");

  try {
    await createClass(teacher.id, { name, period, room });
  } catch {
    redirect("/classes/new?error=create");
  }

  revalidatePath("/", "layout");
  redirect("/roster");
}

export async function updateClassAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  if (!classId) redirect("/settings");
  if (!name || !period) redirect(`/classes/${classId}/edit?error=missing`);

  try {
    await updateClass(teacher.id, classId, { name, period, room });
  } catch {
    redirect(`/classes/${classId}/edit?error=save`);
  }

  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function archiveClassAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "");
  if (!classId) return;
  await archiveClass(teacher.id, classId);

  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function restoreClassAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "");
  if (!classId) return;
  await restoreClass(teacher.id, classId);

  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function deleteClassAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "");
  if (!classId) return;
  await deleteClass(teacher.id, classId);

  revalidatePath("/", "layout");
  redirect("/settings");
}

export type StudentEditState = {
  ok: false;
  message: string;
} | null;

export async function updateStudentAction(
  _previous: StudentEditState,
  formData: FormData,
): Promise<StudentEditState> {
  const teacher = await getCurrentTeacher();
  if (!teacher) return { ok: false, message: "Your session expired. Sign in again." };

  const studentId = String(formData.get("studentId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const externalId = String(formData.get("externalId") ?? "").trim();
  if (!studentId) return { ok: false, message: "Missing student." };
  if (!firstName || !lastName || !externalId) {
    return { ok: false, message: "Add a first name, last name, and student ID." };
  }

  try {
    await updateStudent(teacher.id, studentId, { firstName, lastName, externalId });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save those changes.",
    };
  }

  revalidatePath("/roster");
  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath(`/student/${studentId}`);
  redirect(`/student/${studentId}`);
}

export async function removeStudentAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!classId || !studentId) redirect("/roster");

  await removeStudentFromClass(teacher.id, classId, studentId);

  revalidatePath("/roster");
  revalidatePath("/home");
  revalidatePath("/reports");
  redirect("/roster");
}

export type StudentImportState = {
  ok: boolean;
  message: string;
  details?: string[];
} | null;

export async function selectClassAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error("Unauthorized");
  const classId = String(formData.get("classId") ?? "");
  if (!classId) return;
  await selectClass(teacher.id, classId);
  revalidatePath("/", "layout");
}

export async function addStudentsAction(
  _previous: StudentImportState,
  formData: FormData,
): Promise<StudentImportState> {
  const teacher = await getCurrentTeacher();
  if (!teacher) return { ok: false, message: "Your session expired. Sign in again." };

  const classId = String(formData.get("classId") ?? "");
  const text = String(formData.get("students") ?? "");
  const parsed = parseBulkStudents(text);

  if (!parsed.rows.length) {
    return { ok: false, message: "Paste at least one student first." };
  }
  if (parsed.errors.length) {
    return {
      ok: false,
      message: `Fix ${parsed.errors.length} line${parsed.errors.length === 1 ? "" : "s"} before importing.`,
      details: parsed.errors.slice(0, 8).map((row) => `Line ${row.line}: ${row.error}`),
    };
  }

  try {
    const result = await addStudentsBulk(teacher.id, classId, parsed.rows);
    revalidatePath("/roster");
    revalidatePath("/home");
    revalidatePath("/reports");
    const parts = [];
    if (result.added) parts.push(`${result.added} new`);
    if (result.enrolled) parts.push(`${result.enrolled} joined`);
    if (result.skipped) parts.push(`${result.skipped} skipped`);
    return {
      ok: true,
      message: parts.length ? parts.join(" · ") : "No new students to add.",
    };
  } catch {
    return { ok: false, message: "Could not add students. Check the class and try again." };
  }
}

export type ScanResult =
  | { ok: true; href: string; name: string; classroom: string }
  | { ok: false; message: string };

export async function resolveScanAction(code: string): Promise<ScanResult> {
  const teacher = await getCurrentTeacher();
  if (!teacher) return { ok: false, message: "Your session expired. Sign in again." };
  const resolved = await resolveScannedStudent(teacher.id, code);
  if (!resolved) {
    return {
      ok: false,
      message: "That code doesn't match a student in your classes. Try the roster search.",
    };
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    href: `/student/${resolved.student.id}`,
    name: [resolved.student.firstName, resolved.student.lastName].join(" "),
    classroom: classLabel(resolved.classroom),
  };
}

export type IncidentFormState = {
  ok: false;
  message: string;
} | null;

export async function saveIncidentAction(
  _previous: IncidentFormState,
  formData: FormData,
): Promise<IncidentFormState> {
  const teacher = await getCurrentTeacher();
  if (!teacher) return { ok: false, message: "Your session expired. Sign in again." };

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const behaviorIds = formData.getAll("behaviors").map(String);
  if (!classId || !studentId) return { ok: false, message: "Missing student or class." };
  if (!(await isStudentInClass(teacher.id, classId, studentId))) {
    return { ok: false, message: "That student is not in this class." };
  }
  if (!behaviorIds.length) return { ok: false, message: "Choose at least one behavior." };

  const available = await getBehaviors(teacher.id);
  const chosen = available.filter((behavior) => behaviorIds.includes(behavior.id));
  if (!chosen.length) return { ok: false, message: "Those behaviors are no longer available." };

  const settings = await getSettings(teacher.id);
  const needsNote = chosen.some(
    (behavior) => behavior.requiresNote || (behavior.system && settings.requireOtherNote),
  );
  if (needsNote && !note) {
    return { ok: false, message: "Add a note for the behavior that requires context." };
  }

  const rawSeverity = String(formData.get("severity") ?? "");
  const severity = settings.showSeverity && ["low", "medium", "high"].includes(rawSeverity)
    ? rawSeverity
    : null;

  try {
    await createIncident({
      teacherId: teacher.id,
      classId,
      studentId,
      behaviors: chosen,
      note,
      severity,
    });
  } catch {
    return { ok: false, message: "Could not save that entry. Try again." };
  }

  revalidatePath("/home");
  revalidatePath("/roster");
  revalidatePath(`/student/${studentId}`);
  redirect("/home?saved=1");
}
