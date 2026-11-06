import { BarChart3, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClassSwitcher } from "@/components/class-switcher";
import { EmptyState } from "@/components/empty-state";
import { nameOf } from "@/lib/format";
import { getClassCounts, getClasses, getReport, getSelectedClass } from "@/lib/store";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Reports",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const classroom = await getSelectedClass(teacher.id);
  if (!classroom) redirect("/home");

  const { days: rawDays } = await searchParams;
  const days = rawDays === "30" ? 30 : 7;
  const classes = await getClasses(teacher.id);
  const counts = await getClassCounts(teacher.id);
  const report = await getReport(teacher.id, classroom.id, days);
  const maxBehavior = Math.max(1, ...report.behaviors.map((behavior) => behavior.count));

  return (
    <main className="px-5 pb-8 pt-7 lg:px-10 lg:pb-12 lg:pt-10">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Class report</p>
        <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.045em] lg:text-[38px]">Reports</h1>
      </header>

      <div className="mt-5 lg:max-w-xl">
        <ClassSwitcher classes={classes} activeId={classroom.id} counts={counts} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:max-w-xl">
        <Link
          href="?days=7"
          className={`rounded-xl border px-3 py-2 text-center text-xs font-bold ${
            days === 7 ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted"
          }`}
        >
          Last 7 days
        </Link>
        <Link
          href="?days=30"
          className={`rounded-xl border px-3 py-2 text-center text-xs font-bold ${
            days === 30 ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted"
          }`}
        >
          Last 30 days
        </Link>
      </div>

      <section className="mt-4 grid grid-cols-3 gap-2 lg:max-w-xl">
        <Stat label="entries" value={report.entries} />
        <Stat label="students" value={report.students} />
        <Stat label="positive" value={`${report.positiveShare}%`} positive />
      </section>

      {report.entries ? (
        <div className="xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
          <section className="mt-6">
            <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Behaviors
            </h2>
            <div className="space-y-2 rounded-2xl border border-line bg-surface p-3">
              {report.behaviors.map((behavior) => (
                <div key={`${behavior.label}-${behavior.tone}`} className="grid grid-cols-[90px_1fr_26px] items-center gap-2 lg:grid-cols-[130px_1fr_30px]">
                  <span className="truncate text-[11px] font-semibold">{behavior.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={`block h-full rounded-full ${
                        behavior.tone === "positive" ? "bg-positive" : behavior.tone === "concern" ? "bg-concern" : "bg-muted"
                      }`}
                      style={{ width: `${Math.max(4, (behavior.count / maxBehavior) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right text-[11px] font-bold text-muted">{behavior.count}</span>
                </div>
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
        CSV export, custom date ranges, and printable reports are the next reporting slice.
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
