const COMMON_TENANTS = new Set(["common", "organizations", "consumers"]);
const AUTH_URL_KEYS = ["AUTH_URL", "NEXTAUTH_URL"] as const;
const LOCAL_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i;

/**
 * Auth.js parses AUTH_URL/NEXTAUTH_URL with `new URL()` while handling every
 * request. Hosting dashboards commonly store just the hostname, which makes
 * `new URL()` throw `ERR_INVALID_URL` during the login page render. Repair the
 * value once at module load so either form works.
 */
function normalizeAuthUrlEnv() {
  for (const key of AUTH_URL_KEYS) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;

    try {
      new URL(raw);
      process.env[key] = raw;
      continue;
    } catch {
      // Fall through and retry with a scheme prepended.
    }

    const host = raw.replace(/^\/+/, "");
    const protocol = LOCAL_HOST.test(host) ? "http" : "https";
    const normalized = `${protocol}://${host}`;

    try {
      new URL(normalized);
      process.env[key] = normalized;
      console.warn(`[auth] ${key} was missing a protocol; using ${normalized}`);
    } catch {
      console.error(`[auth] Ignoring invalid ${key}: ${raw}`);
      delete process.env[key];
    }
  }
}

normalizeAuthUrlEnv();

/**
 * Microsoft's OIDC discovery document returns the issuer without a trailing
 * slash (`.../v2.0`), and the OIDC client compares it byte-for-byte. Accept
 * either form in the environment but always hand the provider the exact value
 * Microsoft publishes.
 */
function normalizeIssuer(raw: string) {
  return raw.trim().replace(/\/+$/, "");
}

export type MicrosoftProfileClaims = {
  tid?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
};

export type MicrosoftAuthStatus = {
  configured: boolean;
  partial: boolean;
  clientId: string;
  tenantId: string;
  issuer: string;
  missing: string[];
  tenantRestricted: boolean;
};

/**
 * Server-only auth configuration checks. Never expose the client secret to a
 * client component.
 */
export function getMicrosoftAuthStatus(): MicrosoftAuthStatus {
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim() ?? "";
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim() ?? "";
  const issuer = normalizeIssuer(process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "");
  const tenantMatch = issuer.match(/login\.microsoftonline\.com\/([^/]+)/i);
  const tenantId = tenantMatch?.[1] ?? "";
  const missing: string[] = [];

  if (!clientId) missing.push("AUTH_MICROSOFT_ENTRA_ID_ID");
  if (!clientSecret) missing.push("AUTH_MICROSOFT_ENTRA_ID_SECRET");
  if (!issuer) missing.push("AUTH_MICROSOFT_ENTRA_ID_ISSUER");

  return {
    configured: missing.length === 0,
    partial: missing.length > 0 && missing.length < 3,
    clientId,
    tenantId,
    issuer,
    missing,
    tenantRestricted: Boolean(tenantId) && !COMMON_TENANTS.has(tenantId.toLowerCase()),
  };
}
