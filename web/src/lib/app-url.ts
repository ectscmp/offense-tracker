import { headers } from "next/headers";

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i;

/** Accept `host`, `host:port`, or a full URL and return a bare origin. */
function normalizeOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const withScheme = HAS_SCHEME.test(value)
    ? value
    : `${LOOPBACK.test(value) ? "http" : "https"}://${value.replace(/^\/+/, "")}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

/**
 * Absolute origin for links that leave the app (printed QR codes, shared URLs).
 * Prefer an explicit public URL, then the Auth.js origin, and finally the
 * request host so both localhost and the Railway domain work without extra
 * configuration.
 */
export async function getAppOrigin(): Promise<string | null> {
  for (const key of ["APP_URL", "NEXT_PUBLIC_APP_URL", "AUTH_URL", "NEXTAUTH_URL"]) {
    const origin = normalizeOrigin(process.env[key]);
    if (origin) return origin;
  }

  const store = await headers();
  const host = (store.get("x-forwarded-host") ?? store.get("host"))?.split(",")[0]?.trim();
  if (!host) return null;

  const proto =
    store.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (LOOPBACK.test(host) ? "http" : "https");

  return normalizeOrigin(`${proto}://${host}`);
}

/** Public, camera-friendly link encoded into a printed student QR card. */
export function studentQrUrl(origin: string, token: string): string {
  return `${origin}/s/${encodeURIComponent(token)}`;
}
