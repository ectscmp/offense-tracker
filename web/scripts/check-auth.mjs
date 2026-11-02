import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim() ?? "";
const secret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim() ?? "";
const issuer = (process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.trim() ?? "").replace(/\/+$/, "");
const devAuth = process.env.ENABLE_DEV_AUTH === "true";
const required = [
  ["AUTH_MICROSOFT_ENTRA_ID_ID", clientId],
  ["AUTH_MICROSOFT_ENTRA_ID_SECRET", secret],
  ["AUTH_MICROSOFT_ENTRA_ID_ISSUER", issuer],
];

console.log("Microsoft Entra ID configuration\n");
for (const [key, value] of required) {
  console.log(`${value ? "✓" : "✗"} ${key}${value ? " is set" : " is missing"}`);
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tenant = issuer.match(/login\.microsoftonline\.com\/([^/]+)/i)?.[1] ?? "";
if (issuer) {
  console.log(`${tenant ? "✓" : "!"} Issuer tenant: ${tenant || "could not parse"}`);
  if (["common", "organizations", "consumers"].includes(tenant.toLowerCase())) {
    console.log("! Use the district tenant ID instead of the common issuer.");
  } else if (tenant && !GUID.test(tenant)) {
    console.log(
      "! Issuer tenant is not a GUID. Use the Directory (tenant) ID, not the domain name:\n" +
        "  https://login.microsoftonline.com/<directory-tenant-id>/v2.0",
    );
  }
  console.log(`  Issuer sent to the provider: ${issuer}`);
}

if (devAuth) {
  console.log("\n! ENABLE_DEV_AUTH=true. Set it to false for a real deployment.");
}

const baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
console.log(`\nCallback URL for the Entra app registration:\n${baseUrl}/api/auth/callback/microsoft-entra-id`);

if (required.some(([, value]) => !value)) {
  console.log("\nMicrosoft sign-in is not configured. See web/AUTH_SETUP.md.");
  process.exit(1);
}

console.log("\nMicrosoft sign-in configuration is present.");
