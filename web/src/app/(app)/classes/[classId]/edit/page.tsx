import { AlertTriangle, Archive, ArrowLeft, Building2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  archiveClassAction,
  deleteClassAction,
  updateClassAction,
} from "@/app/actions";
import { ConfirmForm } from "@/components/confirm-form";
import { getClass } from "@/lib/store";
import { classLabel } from "@/lib/format";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Edit class",
};

export default async function EditClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const { classId } = await params;
  const classroom = await getClass(teacher.id, classId);
  if (!classroom) notFound();

  const { error } = await searchParams;

  return (
    <main className="px-5 pb-8 pt-5 lg:mx-auto lg:max-w-3xl lg:px-10 lg:py-10">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Classroom setup
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] lg:text-[32px]">
            Edit class
          </h1>
        </div>
      </header>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Building2 size={20} />
          </span>
          <div>
            <p className="text-sm font-bold">{classLabel(classroom)}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Renaming the class also updates its roster, reports, and QR cards.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-concern/30 bg-concern-soft p-3 text-xs font-semibold text-concern">
          {error === "missing"
            ? "Add a class name and period before continuing."
            : "Could not save those changes. Try again."}
        </p>
      ) : null}

      <form action={updateClassAction} className="mt-5 space-y-4">
        <input type="hidden" name="classId" value={classroom.id} />
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-muted">Class name</span>
          <input
            name="name"
            required
            maxLength={40}
            defaultValue={classroom.name}
            className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">Period</span>
            <input
              name="period"
              required
              maxLength={20}
              defaultValue={classroom.period}
              className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">Room</span>
            <input
              name="room"
              maxLength={20}
              defaultValue={classroom.room}
              className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
            />
          </label>
        </div>
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
          <Save size={17} />
          Save changes
        </button>
      </form>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-warn" />
          <h2 className="text-sm font-extrabold">Class lifecycle</h2>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          Archive keeps the roster and entries so you can restore the class later. Deleting is
          permanent.
        </p>

        <div className="mt-4 space-y-2">
          <ConfirmForm
            action={archiveClassAction}
            confirmMessage={`Archive ${classLabel(classroom)}? You can restore it from Settings.`}
            hidden={{ classId: classroom.id }}
          >
            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-xs font-bold text-foreground">
              <Archive size={16} />
              Archive class
            </button>
          </ConfirmForm>

          <ConfirmForm
            action={deleteClassAction}
            confirmMessage={`Permanently delete ${classLabel(classroom)}? This also removes its roster and all behavior entries for this class. This cannot be undone.`}
            hidden={{ classId: classroom.id }}
          >
            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-concern/30 bg-concern-soft text-xs font-bold text-concern">
              <Trash2 size={16} />
              Delete class permanently
            </button>
          </ConfirmForm>
        </div>
      </section>
    </main>
  );
}
