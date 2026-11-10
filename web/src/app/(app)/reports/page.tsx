import { BarChart3, ChevronDown, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClassSwitcher } from "@/components/class-switcher";
import { DateRangeControls } from "@/components/date-range-controls";
import { EmptyState } from "@/components/empty-state";
import { resolveDateRange, type RangeParams } from "@/lib/date-range";
import { nameOf } from "@/lib/format";
import { getClassCounts, getClasses, getReport, getSelectedClass } from "@/lib/store";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Reports",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<RangeParams>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const classroom = await getSelectedClass(teacher.id);
  if (!classroom) redirect("/home");

  const range = resolveDateRange(await searchParams);
  const classes = await getClasses(teacher.id);
  const counts = await getClassCounts(teacher.id);
  const report = await getReport(teacher.id, classroom.id, {
    from: range.from,
    to: range.to,
  });
  const maxBehavior = Math.max(1, ...report.behaviors.map((behavior) => behavior.count));

  return (
    <main className="px-5 pb-8 pt-7 lg:px-10 lg:pb-12 lg:pt-10">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          Class report · {range.label}
        </p>
        <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.045em] lg:text-[38px]">Reports</h1>
      </header>

      <div className="mt-5 lg:max-w-xl">
        <ClassSwitcher classes={classes} activeId={classroom.id} counts={counts} />
      </div>

      <DateRangeControls range={range} />

      <section className="mt-4 grid grid-cols-3 gap-2 lg:max-w-xl">
        <Stat label="entries" value={report.entries} />
        <Stat label="students" value={report.students} />
        <Stat label="positive" value={`${report.positiveShare}%`} positive />
      </section>

      {report.entries ? (
        <div className="xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
                Behaviors
              </h2>
              <span className="text-[10px] font-semibold text-muted-2">
                Tap a behavior to see students
              </span>
            </div>
            <div className="space-y-1 rounded-2xl border border-line bg-surface p-2">
              {report.behaviors.map((behavior) => (
                <details
                  key={`${behavior.label}-${behavior.tone}`}
                  className="group rounded-xl transition-colors open:bg-surface-2"
                >
                  <summary className="grid cursor-pointer list-none grid-cols-[92px_1fr_44px] items-center gap-2 rounded-xl p-2 hover:bg-surface-2 lg:grid-cols-[132px_1fr_48px]">
                    <span className="truncate text-[11px] font-semibold">{behavior.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-surface-2 group-open:bg-surface">
                      <span
                        className={`block h-full rounded-full ${
                          behavior.tone === "positive"
                            ? "bg-positive"
                            : behavior.tone === "concern"
                              ? "bg-concern"
                              : "bg-muted"
                        }`}
                        style={{ width: `${Math.max(4, (behavior.count / maxBehavior) * 100)}%` }}
                      />
                    </span>
                    <span className="flex items-center justify-end gap-1 text-[11px] font-bold text-muted">
                      {behavior.count}
                      <ChevronDown
                        size={13}
                        className="text-muted-2 transition-transform group-open:rotate-180"
                      />
                    </span>
                  </summary>
                  <div className="space-y-0.5 px-2 pb-2 pt-0.5">
                    {behavior.students.map((student) => (
                      <Link
                        key={student.id}
                        href={`/student/${student.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1 text-[11px] transition-colors hover:bg-surface hover:text-brand"
                      >
                        <span className="min-w-0 truncate font-semibold">{student.name}</span>
                        <span className="shrink-0 text-[10px] font-bold text-muted">
                          {student.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Students
            </h2>
            <div className="space-y-2">
              {report.studentRows.map((student) => (
                <Link
                  key={student.id}
                  href={`/student/${student.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[10px] font-extrabold text-brand">
                    {student.firstName.charAt(0)}
                    {student.lastName.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{nameOf(student)}</span>
                  <span className="text-xs font-bold text-muted">{student.count}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState icon={BarChart3} title="No entries in this range">
            Log a behavior or choose a wider date range.
          </EmptyState>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-[11px] leading-5 text-muted">
        <UsersRound size={17} className="mt-0.5 shrink-0 text-brand" />
        CSV export and printable reports are the next reporting slice.
      </div>
    </main>
  );
}

function Stat({ label, value, positive = false }: Readonly<{ label: string; value: number | string; positive?: boolean }>) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3 text-center">
      <strong className={`block text-xl tracking-[-0.03em] ${positive ? "text-positive" : ""}`}>{value}</strong>
      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
    </div>
  );
}
