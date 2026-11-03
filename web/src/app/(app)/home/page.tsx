import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Plus,
  ScanLine,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ClassSwitcher } from "@/components/class-switcher";
import { EmptyState } from "@/components/empty-state";
import {
  classLabel,
  classShort,
  formatDateHeading,
  formatTime,
  greeting,
  nameOf,
} from "@/lib/format";
import { getClassCounts, getClasses, getDashboard, getSelectedClass } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Home",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const classes = await getClasses(teacher.id);
  const classroom = await getSelectedClass(teacher.id);
  const { saved } = await searchParams;

  if (!classroom) {
    return (
      <main className="px-5 pb-8 pt-10 lg:px-10 lg:pt-12">
        <div className="lg:max-w-xl">
          <EmptyState icon={Users} title="No classes yet">
            Create a class before adding a roster.
          </EmptyState>
          <Link
            href="/classes/new"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20"
          >
            <Plus size={17} />
            Create your first class
          </Link>
        </div>
      </main>
    );
  }

  const counts = await getClassCounts(teacher.id);
  const data = await getDashboard(teacher.id, classroom);

  return (
    <main className="px-5 pb-8 pt-7 lg:px-10 lg:pb-12 lg:pt-10">
      {saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-positive/30 bg-positive-soft px-3 py-2.5 text-xs font-bold text-positive">
          <CheckCircle2 size={16} />
          Entry saved
        </div>
      ) : null}

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {formatDateHeading(new Date())}
          </p>
          <h1 className="mt-1 text-[30px] font-extrabold leading-[1.02] tracking-[-0.045em] lg:text-[38px]">
            {greeting()},<br />
            {teacher.name}
          </h1>
        </div>
        <Link href="/settings" aria-label="Settings">
          <Avatar name={teacher.name} color="#6366f1" />
        </Link>
      </header>

      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-start xl:gap-8">
        <div className="min-w-0">
          <ClassSwitcher classes={classes} activeId={classroom.id} counts={counts} />

          <Link
            href="/scan"
            className="mt-4 flex items-center gap-4 rounded-3xl bg-brand p-5 text-white shadow-xl shadow-indigo-500/25 lg:mt-5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <ScanLine size={25} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-lg tracking-tight">Scan a student</strong>
              <small className="mt-0.5 block text-xs text-white/75">ID card or class QR</small>
            </span>
            <ArrowUpRight size={20} className="opacity-80" />
          </Link>

          <section className="mt-4 grid grid-cols-3 gap-2 lg:gap-3">
            <Stat value={data.todayEntries} label="entries" />
            <Stat value={data.todayStudents} label="students" />
            <Stat value={`${data.positiveShare}%`} label="positive" accent />
          </section>

          <section className="mt-7">
            <div className="mb-2.5 flex items-end justify-between">
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em]">Latest</h2>
              <Link href="/reports" className="text-[11px] font-bold text-brand">
                View reports
              </Link>
            </div>
            {data.latest.length ? (
              <div className="space-y-2 2xl:grid 2xl:grid-cols-2 2xl:gap-3 2xl:space-y-0">
                {data.latest.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/student/${incident.studentId}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    <Avatar name={nameOf(incident.student)} color={incident.student.color} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <strong className="truncate text-xs">{nameOf(incident.student)}</strong>
                        <small className="shrink-0 text-[10px] text-muted">
                          {formatTime(incident.occurredAt)}
                        </small>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {incident.behaviors.map((behavior) => behavior.label).join(" · ")}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-2" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock3} title="Nothing logged yet">
                This class’s latest entries will show up here.
              </EmptyState>
            )}
          </section>
        </div>

        <aside className="mt-7 min-w-0 xl:mt-0">
          <section>
            <div className="mb-2.5 flex items-end justify-between">
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em]">Recent</h2>
              <span className="text-[11px] text-muted">{classShort(classroom)} · today</span>
            </div>
            {data.recentStudents.length ? (
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
                {data.recentStudents.map((student) => (
                  <Link
                    key={student.id}
                    href={`/student/${student.id}`}
                    className="w-[78px] shrink-0 rounded-2xl border border-line bg-surface px-2 py-3 text-center transition-colors hover:border-line-strong hover:bg-surface-2 lg:w-auto lg:min-w-0"
                  >
                    <Avatar name={student.name} color={student.color} />
                    <span className="mt-2 block truncate text-[11px] font-bold">{student.name}</span>
                    <span className="mt-0.5 block text-[9px] text-muted">{student.count} today</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={ScanLine} title="No one logged today">
                Scan a card or open the roster to start.
              </EmptyState>
            )}
          </section>

          <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 lg:mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Active class</p>
            <p className="mt-1 text-sm font-bold">{classLabel(classroom)}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Room {classroom.room} · {data.rosterCount} students
            </p>
          </div>

          <div className="mt-4 hidden rounded-2xl border border-line bg-surface p-4 xl:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              Quick actions
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/roster"
                className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-[11px] font-bold text-brand hover:border-brand/40"
              >
                Roster
              </Link>
              <Link
                href="/reports"
                className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-[11px] font-bold text-brand hover:border-brand/40"
              >
                Reports
              </Link>
              <Link
                href="/roster/add"
                className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-[11px] font-bold text-brand hover:border-brand/40"
              >
                Add students
              </Link>
              <Link
                href="/roster/print"
                className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-[11px] font-bold text-brand hover:border-brand/40"
              >
                QR cards
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3 text-center">
      <strong className={`block text-xl tracking-[-0.03em] ${accent ? "text-positive" : ""}`}>{value}</strong>
      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
    </div>
  );
}
