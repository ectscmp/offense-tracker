import { BarChart3, Building2, ScanLine, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMicrosoftAuthStatus } from "@/lib/auth-config";
import { signInWithMicrosoft } from "./actions";

export const metadata = {
  title: "Sign in",
};

function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const redirectTo = safeRedirect(next);
  const session = await auth();
  if (session?.user?.email) redirect(redirectTo);
  const microsoft = getMicrosoftAuthStatus();
  const errorText =
    error === "AccessDenied"
      ? "That Microsoft account is not allowed for this school tenant."
      : error
        ? "Sign-in could not be completed. Check the Microsoft configuration or contact your administrator."
        : "";

  return (
    <main className="app-frame mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 pb-10 pt-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center lg:gap-16 lg:px-12 lg:py-16 xl:gap-24">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 text-xs font-bold text-muted">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
            <ScanLine size={17} />
          </span>
          Offense Tracker
        </div>

        <section className="flex flex-1 flex-col justify-center py-12 lg:py-14">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Teacher workspace
          </p>
          <h1 className="max-w-sm text-[42px] font-extrabold leading-[0.98] tracking-[-0.055em] lg:max-w-xl lg:text-[54px]">
            Log behavior before the moment passes.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted lg:max-w-lg lg:text-base">
            Scan a student, tap what happened, add context if it helps. Reports and rosters stay
            tied to your classroom.
          </p>

          <div className="mt-8 max-w-lg space-y-2.5">
            <Feature icon={ScanLine} text="Scan a student ID or classroom QR label" />
            <Feature icon={BarChart3} text="Date-ranged reports by class" />
            <Feature icon={Building2} text="Teacher-managed classes and rosters" />
          </div>
        </section>
      </div>

      <section className="space-y-3 lg:rounded-3xl lg:border lg:border-line lg:bg-surface lg:p-6 lg:shadow-xl">
        <div className="hidden lg:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Sign in</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">School sign-in</h2>
        </div>

        {errorText ? (
          <p className="rounded-xl border border-concern/30 bg-concern-soft p-3 text-xs font-semibold text-concern">
            {errorText}
          </p>
        ) : null}

        {microsoft.configured ? (
          <form action={signInWithMicrosoft}>
            <input type="hidden" name="next" value={redirectTo} />
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
              <MicrosoftMark />
              Continue with Microsoft
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-warn" />
              <div>
                <p className="text-sm font-bold text-warn">Microsoft sign-in needs configuration</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Register an Entra app and add the values to{" "}
                  <code className="font-mono text-[11px]">web/.env.local</code>. Run{" "}
                  <code className="font-mono text-[11px]">npm run auth:check</code> to see what is
                  missing.
                </p>
                {microsoft.missing.length ? (
                  <p className="mt-2 font-mono text-[10px] leading-5 text-muted">
                    {microsoft.missing.join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] leading-5 text-muted">
          {microsoft.configured
            ? "Use your school Microsoft account. Anyone in the district tenant can create a class and add students."
            : "Real Microsoft sign-in cannot start until the Entra app registration is connected. Use fictional data."}
        </p>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof ScanLine; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <Icon size={17} className="text-brand" />
      <span className="text-xs font-semibold text-foreground">{text}</span>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <span className="grid h-4 w-4 grid-cols-2 gap-[1px]" aria-hidden="true">
      <span className="bg-[#f25022]" />
      <span className="bg-[#7fba00]" />
      <span className="bg-[#00a4ef]" />
      <span className="bg-[#ffb900]" />
    </span>
  );
}
