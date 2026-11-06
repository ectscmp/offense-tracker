import { ArrowLeft, UserRoundX, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { removeStudentAction } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { ConfirmForm } from "@/components/confirm-form";
import { StudentEditForm } from "@/components/student-edit-form";
import { getStudent, getStudentClass } from "@/lib/store";
import { classLabel, nameOf } from "@/lib/format";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Edit student",
};

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const { studentId } = await params;
  const student = await getStudent(teacher.id, studentId);
  if (!student) notFound();

  const classroom = await getStudentClass(teacher.id, student.id);
  if (!classroom) notFound();

  return (
    <main className="px-5 pb-8 pt-5 lg:mx-auto lg:max-w-3xl lg:px-10 lg:py-10">
      <header className="flex items-center gap-3">
        <Link
          href={`/student/${student.id}`}
          aria-label="Back to student"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            {classLabel(classroom)}
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] lg:text-[32px]">
            Edit student
          </h1>
        </div>
      </header>

      <section className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <Avatar name={nameOf(student)} color={student.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{nameOf(student)}</p>
          <p className="mt-0.5 text-[11px] text-muted">ID {student.externalId}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <UserRoundPen size={17} />
        </span>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <StudentEditForm student={student} />
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <UserRoundX size={16} className="text-concern" />
          <h2 className="text-sm font-extrabold">Remove from class</h2>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          Removes this student from {classLabel(classroom)}. If this is their only class, their
          student record and behavior entries are also deleted. This cannot be undone.
        </p>
        <ConfirmForm
          action={removeStudentAction}
          confirmMessage={`Remove ${nameOf(student)} from ${classLabel(classroom)}? If this is their only class, their student record and entries are deleted permanently.`}
          hidden={{ classId: classroom.id, studentId: student.id }}
          className="mt-3"
        >
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-concern/30 bg-concern-soft text-xs font-bold text-concern">
            <UserRoundX size={16} />
            Remove {nameOf(student)}
          </button>
        </ConfirmForm>
      </section>
    </main>
  );
}
