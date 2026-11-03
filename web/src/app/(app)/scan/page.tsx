import { ChevronRight, Printer, ScanLine, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ClassSwitcher } from "@/components/class-switcher";
import { EmptyState } from "@/components/empty-state";
import { ScanCamera } from "@/components/scan-camera";
import { nameOf } from "@/lib/format";
import {
  getClassCounts,
  getClasses,
  getRoster,
  getSelectedClass,
  resolveScannedStudent,
} from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Scan",
};

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; code?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const classroom = await getSelectedClass(teacher.id);
  if (!classroom) redirect("/home");

  const { q = "", code = "" } = await searchParams;

  // A printed QR card links here with ?code=<token>; open the student directly.
  let notice = "";
  if (code.trim()) {
    const resolved = await resolveScannedStudent(teacher.id, code);
    if (resolved) redirect(`/student/${resolved.student.id}`);
    notice = "That QR code doesn’t match a student in your classes. Try the roster search or print a new card.";
  }

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
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Fast lookup</p>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.045em] lg:text-[38px]">Scan a student</h1>
        </div>
        <Link
          href="/roster/print"
          aria-label="Print student QR cards"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
        >
          <Printer size={17} />
        </Link>
      </header>

      <div className="mt-5 lg:max-w-xl">
        <ClassSwitcher classes={classes} activeId={classroom.id} counts={counts} />
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-warn/30 bg-warn-soft px-3 py-2 text-xs font-semibold leading-5 text-warn lg:max-w-xl"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-4 xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
        <ScanCamera />

        <div className="mt-4 min-w-0 xl:mt-0">
          <form method="get" className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name or student ID"
              aria-label="Search students"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-base outline-none focus:border-brand"
            />
          </form>

          <div className="mt-4 space-y-2">
            {filtered.map((student) => (
              <Link
                key={student.id}
                href={`/student/${student.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <Avatar name={nameOf(student)} color={student.color} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{nameOf(student)}</strong>
                  <span className="mt-0.5 block text-[11px] text-muted">ID {student.externalId}</span>
                </span>
                <ChevronRight size={16} className="text-muted-2" />
              </Link>
            ))}
          </div>

          {!filtered.length ? (
            <div className="mt-4">
              <EmptyState icon={ScanLine} title="No student found">
                Try another name or ID, or add the student to this class.
              </EmptyState>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
