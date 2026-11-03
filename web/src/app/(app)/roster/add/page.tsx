import { ArrowLeft, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BulkStudentsForm } from "@/components/bulk-students-form";
import { ClassSwitcher } from "@/components/class-switcher";
import { classLabel } from "@/lib/format";
import { getClassCounts, getClasses, getSelectedClass } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Add students",
};

export default async function AddStudentsPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const classroom = await getSelectedClass(teacher.id);
  if (!classroom) redirect("/home");

  const classes = await getClasses(teacher.id);
  const counts = await getClassCounts(teacher.id);

  return (
    <main className="px-5 pb-8 pt-5 lg:mx-auto lg:max-w-3xl lg:px-10 lg:py-10">
      <header className="flex items-center gap-3">
        <Link
          href="/roster"
          aria-label="Back to roster"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            {classLabel(classroom)}
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] lg:text-[32px]">Add students</h1>
        </div>
      </header>

      <div className="mt-5 lg:max-w-md">
        <ClassSwitcher classes={classes} activeId={classroom.id} counts={counts} />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <UsersRound size={20} />
          </span>
          <div>
            <p className="text-sm font-bold">Paste a roster or spreadsheet column</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Existing student IDs join this class instead of creating a duplicate. Adding one
              student? Use the same form with a single line.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <BulkStudentsForm classId={classroom.id} />
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-[11px] leading-5 text-muted">
        <strong className="text-foreground">Expected format</strong>
        <pre className="mt-1 overflow-x-auto font-mono text-[11px]">{`Maya Rodriguez, 100100001
Ethan Chen, 100100002`}</pre>
        <p className="mt-1">Also accepts first, last, ID columns from a spreadsheet.</p>
      </div>
    </main>
  );
}
