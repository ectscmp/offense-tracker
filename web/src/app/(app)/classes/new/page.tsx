import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClassAction } from "@/app/actions";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Add a class",
};

export default async function NewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
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
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Classroom setup</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] lg:text-[32px]">Add a class</h1>
        </div>
      </header>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Building2 size={20} />
          </span>
          <p className="text-[11px] leading-5 text-muted">
            Create the class first, then paste its roster. Classes are scoped to your teacher account.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-concern/30 bg-concern-soft p-3 text-xs font-semibold text-concern">
          Add a class name and period before continuing.
        </p>
      ) : null}

      <form action={createClassAction} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-muted">Class name</span>
          <input
            name="name"
            required
            maxLength={40}
            placeholder="e.g. Geometry"
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
              placeholder="e.g. Period 8"
              className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">Room</span>
            <input
              name="room"
              maxLength={20}
              placeholder="e.g. 214"
              className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
            />
          </label>
        </div>
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
          <Building2 size={17} />
          Create class
        </button>
      </form>
    </main>
  );
}
