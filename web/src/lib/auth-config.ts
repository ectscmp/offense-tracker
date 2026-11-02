const COMMON_TENANTS = new Set(["common", "organizations", "consumers"]);

/**
 * Microsoft's OIDC discovery document returns the issuer without a trailing
 * slash (`.../v2.0`), and the OIDC client compares it byte-for-byte. Accept
 * either form in the environment but always hand the provider the exact value
 * Microsoft publishes.
 */
function normalizeIssuer(raw: string) {
  return raw.trim().replace(/\/+$/, "");
}

export type MicrosoftAuthStatus = {
  configured: boolean;
  partial: boolean;
  clientId: string;
  tenantId: string;
  issuer: string;
  missing: string[];
  tenantRestricted: boolean;
  devAuthEnabled: boolean;
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
    devAuthEnabled: process.env.ENABLE_DEV_AUTH === "true",
  };
}
