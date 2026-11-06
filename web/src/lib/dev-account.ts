/**
 * The local test account used by the development-only sign-in path.
 *
 * Only the browser keeps this record; it is persisted in localStorage so the
 * same dev identity is reused across reloads and dev-server restarts. This
 * module must stay safe to import from server code (the helpers guard against a
 * missing `window`).
 */
export type DevAccount = {
  email: string;
  name: string;
};

export const DEV_ACCOUNT_STORAGE_KEY = "offense-tracker.dev-account.v1";

export const DEFAULT_DEV_ACCOUNT: DevAccount = {
  email: "dev@offense-tracker.local",
  name: "Dev Teacher",
};

const EMAIL = /^[^\s@]+@[^\s@]+$/;

export function normalizeDevAccount(input: unknown): DevAccount {
  const record =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawEmail = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const rawName = typeof record.name === "string" ? record.name.trim() : "";

  return {
    email: EMAIL.test(rawEmail) ? rawEmail : DEFAULT_DEV_ACCOUNT.email,
    name: rawName.slice(0, 80) || DEFAULT_DEV_ACCOUNT.name,
  };
}

export function readDevAccount(): DevAccount | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DEV_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeDevAccount(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDevAccount(account: DevAccount): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DEV_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Storage can be unavailable (private mode, disabled cookies). The form
    // still submits the in-memory account.
  }
}
