import { ChevronRight, Plus, Printer, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ClassSwitcher } from "@/components/class-switcher";
import { EmptyState } from "@/components/empty-state";
import { formatDay, nameOf } from "@/lib/format";
import { getClassCounts, getClasses, getRoster, getSelectedClass } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Roster",
};

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const classroom = await getSelectedClass(teacher.id);
  if (!classroom) redirect("/home");

  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const roster = await getRoster(teacher.id, classroom.id);
  const filtered = query
    ? roster.filter((student) =>
        `${student.firstName} ${student.lastName} ${student.externalId}`.toLowerCase().includes(query),
      )
    : roster;
  const classes = await getClasses(teacher.id);
  const counts = await getClassCounts(teacher.id);

  return (
    <main className="px-5 pb-8 pt-7 lg:px-10 lg:pb-12 lg:pt-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Class roster</p>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.045em] lg:text-[38px]">Students</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/roster/print"
            aria-label="Print student QR cards"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface"
          >
            <Printer size={16} />
          </Link>
          <Link
            href="/roster/add"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white"
          >
            <Plus size={16} />
            Add
          </Link>
        </div>
      </header>

      <div className="mt-5 lg:max-w-xl">
        <ClassSwitcher classes={classes} activeId={classroom.id} counts={counts} />
      </div>

      <p className="mt-2 px-1 text-[11px] text-muted">
        {roster.length} students · {counts[classroom.id] ?? 0} enrolled
      </p>

      <form method="get" className="relative mt-4 lg:max-w-xl">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or ID"
          aria-label="Search roster"
          className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-base outline-none focus:border-brand"
        />
      </form>

      <div className="mt-4 space-y-2 lg:hidden">
        {filtered.map((student) => (
          <Link
            key={student.id}
            href={`/student/${student.id}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            <Avatar name={nameOf(student)} color={student.color} />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{nameOf(student)}</strong>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                ID {student.externalId}
                {student.lastAt ? ` · ${formatDay(student.lastAt)}` : " · no logs"}
              </span>
            </span>
            <span className="rounded-lg bg-surface-2 px-2 py-1 text-center">
              <strong className="block text-sm leading-4">{student.logs30d}</strong>
              <small className="text-[8px] font-bold uppercase tracking-wide text-muted">30d</small>
            </span>
            <ChevronRight size={16} className="text-muted-2" />
          </Link>
        ))}
      </div>

      {filtered.length ? (
        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-surface-2 text-[10px] uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Student</th>
                <th className="px-4 py-3 font-bold">Student ID</th>
                <th className="px-4 py-3 font-bold">Last entry</th>
                <th className="px-4 py-3 text-right font-bold">Last 30 days</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((student) => (
                <tr key={student.id} className="transition-colors hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/student/${student.id}`}
                      className="flex items-center gap-3 font-semibold"
                    >
                      <Avatar name={nameOf(student)} color={student.color} size="sm" />
                      <span className="min-w-0 truncate text-sm">{nameOf(student)}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{student.externalId}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {student.lastAt ? formatDay(student.lastAt) : "No logs"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold">{student.logs30d}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/student/${student.id}`}
                      aria-label={`Open ${nameOf(student)}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-2 hover:bg-surface-2 hover:text-brand"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!filtered.length ? (
        <div className="mt-4">
          <EmptyState icon={Users} title={query ? "No matching students" : "No students yet"}>
            {query ? "Try a different name or ID." : "Add one student or paste a whole roster."}
          </EmptyState>
        </div>
      ) : null}

      <Link
        href="/roster/add"
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-bold text-brand lg:hidden"
      >
        <Plus size={17} />
        Add or bulk import students
      </Link>
    </main>
  );
}
