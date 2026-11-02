import { Building2, Database, LogOut, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { classLabel } from "@/lib/format";
import { getMicrosoftAuthStatus } from "@/lib/auth-config";
import { getClassCounts, getClasses, getStats } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";
import { signOutAction } from "@/app/login/actions";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const classes = await getClasses(teacher.id);
  const counts = await getClassCounts(teacher.id);
  const stats = await getStats(teacher.id);
  const microsoft = getMicrosoftAuthStatus();

  return (
    <main className="px-5 pb-8 pt-7">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Account</p>
        <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.045em]">Settings</h1>
      </header>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-4">
        <p className="text-base font-extrabold">{teacher.name}</p>
        <p className="mt-0.5 text-xs text-muted">{teacher.email}</p>
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-[11px] leading-5 text-muted">
          {microsoft.configured
            ? `Microsoft Entra ID is configured${microsoft.tenantRestricted ? ` for tenant ${microsoft.tenantId}` : " (multi-tenant issuer)"}.`
            : "Microsoft sign-in is not configured yet. Add the Entra app values to web/.env.local."}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-brand" />
          <h2 className="text-sm font-extrabold">Classes</h2>
        </div>
        <div className="mt-3 space-y-2">
          {classes.map((classroom) => (
            <div key={classroom.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: classroom.color }} />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs">{classLabel(classroom)}</strong>
                <small className="text-[10px] text-muted">Room {classroom.room}</small>
              </span>
              <span className="text-[11px] font-bold text-muted">{counts[classroom.id] ?? 0}</span>
            </div>
          ))}
        </div>
        <Link
          href="/classes/new"
          className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-xs font-bold text-brand"
        >
          <Plus size={16} />
          Add a class
        </Link>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="classes" value={stats.classes} />
        <Metric label="students" value={stats.students} />
        <Metric label="entries" value={stats.incidents} />
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-brand" />
          <h2 className="text-sm font-extrabold">Database</h2>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          Entries and rosters are stored in MongoDB. Local development uses{" "}
          <code className="font-mono">web/.env.local</code>; the deployed app reads{" "}
          <code className="font-mono">MONGODB_URI</code> from Railway. Tenant-scoped access and
          audit logging are still required before real student data.
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand" />
          <h2 className="text-sm font-extrabold">Before a pilot</h2>
        </div>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-muted">
          <li>Configure the district Entra tenant and callback URL.</li>
          <li>Add tenant-scoped repositories and a database access review.</li>
          <li>Add audit logs, retention rules, and staff access review.</li>
          <li>Complete camera scanning and the printable QR workflow.</li>
        </ul>
      </section>

      <form action={signOutAction} className="mt-4">
        <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-xs font-bold text-concern">
          <LogOut size={16} />
          Sign out
        </button>
      </form>

      <p className="mt-6 text-center text-[10px] text-muted-2">
        Offense Tracker · local production build · use fictional demo data
      </p>
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
