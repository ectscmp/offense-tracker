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

function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function claimList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) =>
      item.toLowerCase(),
    );
  }
  return typeof value === "string"
    ? value
        .split(/[,\s]+/)
        .map((item) => item.toLowerCase())
        .filter(Boolean)
    : [];
}

export type TeacherAccessPolicy = {
  configured: boolean;
  roles: string[];
  groups: string[];
  emails: string[];
  domains: string[];
};

export type MicrosoftProfileClaims = {
  tid?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  roles?: unknown;
  groups?: unknown;
};

/**
 * Teacher authorization is fail-closed: at least one of these allowlists must
 * be configured or no Microsoft account can sign in. App roles are the
 * preferred option; groups work when the app registration emits the groups
 * claim. Email/domain allowlists are useful for a small pilot.
 */
export function getTeacherAccessPolicy(): TeacherAccessPolicy {
  const roles = splitList(process.env.AUTH_TEACHER_ROLES);
  const groups = splitList(process.env.AUTH_TEACHER_GROUPS);
  const emails = splitList(process.env.AUTH_ALLOWED_EMAILS);
  const domains = splitList(process.env.AUTH_ALLOWED_DOMAINS).map((domain) =>
    domain.replace(/^@/, ""),
  );

  return {
    configured: roles.length + groups.length + emails.length + domains.length > 0,
    roles,
    groups,
    emails,
    domains,
  };
}

export function isApprovedTeacher(
  profile: MicrosoftProfileClaims,
  policy: TeacherAccessPolicy = getTeacherAccessPolicy(),
): boolean {
  if (!policy.configured) return false;

  const roles = claimList(profile.roles);
  if (policy.roles.some((role) => roles.includes(role))) return true;

  const groups = claimList(profile.groups);
  if (policy.groups.some((group) => groups.includes(group))) return true;

  const emails = [profile.email, profile.preferred_username, profile.upn]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (policy.emails.some((email) => emails.includes(email))) return true;

  return policy.domains.some((domain) =>
    emails.some((email) => email.endsWith(`@${domain}`)),
  );
}

export type MicrosoftAuthStatus = {
  configured: boolean;
  partial: boolean;
  clientId: string;
  tenantId: string;
  issuer: string;
  missing: string[];
  tenantRestricted: boolean;
  teacherAccessConfigured: boolean;
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
    teacherAccessConfigured: getTeacherAccessPolicy().configured,
  };
}
