import { ArrowLeft, ChevronRight, Clock3, History } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { BehaviorForm } from "@/components/behavior-form";
import { EmptyState } from "@/components/empty-state";
import { classLabel, formatRelativeDay, nameOf } from "@/lib/format";
import {
  getBehaviors,
  getSettings,
  getStudent,
  getStudentClass,
  getStudentHistory,
} from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export default async function StudentPage({
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

  const behaviors = await getBehaviors(teacher.id);
  const settings = await getSettings(teacher.id);
  const history = await getStudentHistory(teacher.id, classroom.id, student.id);
  const instances = history.flatMap((incident) => incident.behaviors);
  const positive = instances.filter((behavior) => behavior.tone === "positive").length;
  const concern = instances.filter((behavior) => behavior.tone === "concern").length;

  return (
    <main className="pb-40 lg:pb-12">
      <header className="flex items-center gap-3 px-5 pt-5 lg:px-10 lg:pt-8">
        <Link
          href="/roster"
          aria-label="Back to roster"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            {classLabel(classroom)}
          </p>
          <h1 className="truncate text-xl font-extrabold tracking-[-0.03em] lg:text-2xl">
            {nameOf(student)}
          </h1>
        </div>
      </header>

      <div className="px-5 lg:px-10">
        <div className="xl:mt-6 xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] xl:items-start xl:gap-8">
          <div className="min-w-0">
            <section className="mt-4 flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 xl:mt-0">
              <Avatar name={nameOf(student)} color={student.color} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold">{nameOf(student)}</p>
                <p className="mt-0.5 text-[11px] text-muted">ID {student.externalId}</p>
              </div>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-muted">
                {classroom.period.replace(/^Period\s+/i, "P")}
              </span>
            </section>

            <section className="mt-3 grid grid-cols-3 gap-2">
              <Summary label="entries" value={history.length} />
              <Summary label="positive" value={positive} accent="positive" />
              <Summary label="concern" value={concern} accent="concern" />
            </section>

            <section className="mt-5 rounded-3xl border border-line bg-surface p-4">
              <BehaviorForm
                classId={classroom.id}
                studentId={student.id}
                behaviors={behaviors}
                showSeverity={settings.showSeverity}
                requireOtherNote={settings.requireOtherNote}
              />
            </section>
          </div>

          <section className="mt-7 min-w-0 xl:mt-0">
            <div className="mb-2 flex items-center gap-2">
              <History size={15} className="text-muted" />
              <h2 className="text-[12px] font-extrabold uppercase tracking-[0.08em]">
                Recent history
              </h2>
            </div>
            {history.length ? (
              <div className="space-y-2">
                {history.map((incident) => (
                  <div key={incident.id} className="rounded-2xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold">
                        {formatRelativeDay(incident.occurredAt)}
                      </span>
                      <ChevronRight size={14} className="text-muted-2" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {incident.behaviors.map((behavior) => (
                        <span
                          key={behavior.id}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            behavior.tone === "positive"
                              ? "border-positive/30 bg-positive-soft text-positive"
                              : behavior.tone === "concern"
                                ? "border-concern/30 bg-concern-soft text-concern"
                                : "border-line bg-surface-2 text-muted"
                          }`}
                        >
                          {behavior.label}
                        </span>
                      ))}
                    </div>
                    {incident.note ? (
                      <p className="mt-2 text-[11px] leading-5 text-muted">{incident.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock3} title="No entries yet">
                This is the first one for this class.
              </EmptyState>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Summary({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "positive" | "concern";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3 text-center">
      <strong
        className={`block text-xl tracking-[-0.03em] ${
          accent === "positive" ? "text-positive" : accent === "concern" ? "text-concern" : ""
        }`}
      >
        {value}
      </strong>
      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
    </div>
  );
}
