import { Archive, Building2, LogOut, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveClassAction, deleteClassAction, restoreClassAction } from "@/app/actions";
import { ConfirmForm } from "@/components/confirm-form";
import { classLabel, formatDay } from "@/lib/format";
import { getArchivedClasses, getClassCounts, getClasses, getStats } from "@/lib/store";
import { getCurrentTeacher } from "@/lib/session";
import { signOutAction } from "@/app/login/actions";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const classes = await getClasses(teacher.id);
  const archived = await getArchivedClasses(teacher.id);
  const counts = await getClassCounts(teacher.id);
  const stats = await getStats(teacher.id);

  return (
    <main className="px-5 pb-8 pt-7 lg:mx-auto lg:max-w-3xl lg:px-10 lg:pb-12 lg:pt-10">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Account</p>
        <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.045em] lg:text-[38px]">
          Settings
        </h1>
      </header>

      <div className="mt-5 space-y-4">
        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-surface p-4">
            <p className="text-base font-extrabold">{teacher.name}</p>
            <p className="mt-0.5 text-xs text-muted">{teacher.email}</p>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-brand" />
              <h2 className="text-sm font-extrabold">Classes</h2>
            </div>
            <div className="mt-3 space-y-2">
              {classes.map((classroom) => (
                <div
                  key={classroom.id}
                  className="flex items-center gap-2 rounded-xl bg-surface-2 p-3"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: classroom.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{classLabel(classroom)}</strong>
                    <small className="text-[10px] text-muted">
                      Room {classroom.room} · {counts[classroom.id] ?? 0} students
                    </small>
                  </span>
                  <Link
                    href={`/classes/${classroom.id}/edit`}
                    aria-label={`Edit ${classLabel(classroom)}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-brand"
                  >
                    <Pencil size={15} />
                  </Link>
                  <ConfirmForm
                    action={archiveClassAction}
                    confirmMessage={`Archive ${classLabel(classroom)}? You can restore it from Settings.`}
                    hidden={{ classId: classroom.id }}
                  >
                    <button
                      aria-label={`Archive ${classLabel(classroom)}`}
                      title="Archive class"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-warn"
                    >
                      <Archive size={15} />
                    </button>
                  </ConfirmForm>
                </div>
              ))}
              {!classes.length ? (
                <p className="rounded-xl bg-surface-2 p-3 text-[11px] text-muted">
                  No active classes. Add one to start a roster.
                </p>
              ) : null}
            </div>
            <Link
              href="/classes/new"
              className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-xs font-bold text-brand"
            >
              <Plus size={16} />
              Add a class
            </Link>

            {archived.length ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                  Archived classes
                </p>
                <div className="mt-2 space-y-2">
                  {archived.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="flex items-center gap-2 rounded-xl border border-line bg-surface p-3"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full opacity-50"
                        style={{ background: classroom.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs">{classLabel(classroom)}</strong>
                        <small className="text-[10px] text-muted">
                          Archived {classroom.archivedAt ? formatDay(classroom.archivedAt) : ""} ·{" "}
                          {counts[classroom.id] ?? 0} students
                        </small>
                      </span>
                      <ConfirmForm
                        action={restoreClassAction}
                        confirmMessage={`Restore ${classLabel(classroom)}?`}
                        hidden={{ classId: classroom.id }}
                      >
                        <button
                          aria-label={`Restore ${classLabel(classroom)}`}
                          title="Restore class"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-brand"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </ConfirmForm>
                      <ConfirmForm
                        action={deleteClassAction}
                        confirmMessage={`Permanently delete ${classLabel(classroom)}? This also removes its roster and all behavior entries for this class. This cannot be undone.`}
                        hidden={{ classId: classroom.id }}
                      >
                        <button
                          aria-label={`Delete ${classLabel(classroom)} permanently`}
                          title="Delete class permanently"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-concern/30 text-concern hover:bg-concern-soft"
                        >
                          <Trash2 size={15} />
                        </button>
                      </ConfirmForm>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid grid-cols-3 gap-2">
            <Metric label="classes" value={stats.classes} />
            <Metric label="students" value={stats.students} />
            <Metric label="entries" value={stats.incidents} />
          </section>
        </div>

        <div className="space-y-4">
          <form action={signOutAction}>
            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-xs font-bold text-concern">
              <LogOut size={16} />
              Sign out
            </button>
          </form>

          <p className="text-center text-[10px] text-muted-2">
            Offense Tracker · production build · use fictional data during the pilot
          </p>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3 text-center">
      <strong className="block text-xl">{value}</strong>
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
    </div>
  );
}
