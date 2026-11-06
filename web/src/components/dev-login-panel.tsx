"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { signInDev } from "@/app/login/actions";
import {
  DEFAULT_DEV_ACCOUNT,
  DEV_ACCOUNT_STORAGE_KEY,
  normalizeDevAccount,
  readDevAccount,
  saveDevAccount,
  type DevAccount,
} from "@/lib/dev-account";

function subscribeToAccount(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function accountSnapshot() {
  try {
    return window.localStorage.getItem(DEV_ACCOUNT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function serverAccountSnapshot() {
  return "";
}

function parseAccount(raw: string): DevAccount {
  if (!raw) return DEFAULT_DEV_ACCOUNT;
  try {
    return normalizeDevAccount(JSON.parse(raw));
  } catch {
    return DEFAULT_DEV_ACCOUNT;
  }
}

/**
 * Development-only login card. The account lives in localStorage, and the
 * panel submits itself automatically so `npm run dev` goes straight into the
 * app. Disabled entirely when the server does not enable dev auth.
 */
export function DevLoginPanel({
  next,
  autoSignIn,
}: {
  next: string;
  autoSignIn: boolean;
}) {
  const stored = useSyncExternalStore(
    subscribeToAccount,
    accountSnapshot,
    serverAccountSnapshot,
  );
  const account = parseAccount(stored);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!autoSignIn || attempted.current) return;
    attempted.current = true;

    // Read storage directly so the first automatic sign-in uses the persisted
    // account even before the client snapshot finishes hydrating.
    const saved = readDevAccount() ?? DEFAULT_DEV_ACCOUNT;
    saveDevAccount(saved);

    if (emailRef.current) emailRef.current.value = saved.email;
    if (nameRef.current) nameRef.current.value = saved.name;
    formRef.current?.requestSubmit();
  }, [autoSignIn]);

  return (
    <div className="rounded-2xl border border-dashed border-brand/45 bg-brand-soft/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
          <FlaskConical size={13} />
          Dev only
        </span>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-bold text-brand">
          localStorage
        </span>
      </div>

      <p className="mt-2 text-xs font-bold">{account.name}</p>
      <p className="text-[10px] text-muted">{account.email}</p>

      <form ref={formRef} action={signInDev} className="mt-2">
        <input ref={emailRef} type="hidden" name="email" value={account.email} />
        <input ref={nameRef} type="hidden" name="name" value={account.name} />
        <input type="hidden" name="next" value={next} />
        <DevSubmitButton />
      </form>

      <p className="mt-2 text-[10px] leading-4 text-muted">
        Local test account. This bypass is disabled automatically in production builds.
      </p>
    </div>
  );
}

function DevSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 w-full items-center justify-center rounded-xl border border-brand/30 bg-surface text-xs font-bold text-brand disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Continue as local test account"}
    </button>
  );
}
