import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim() ?? "";
const secret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim() ?? "";
const issuer = (process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.trim() ?? "").replace(/\/+$/, "");
const required = [
  ["AUTH_MICROSOFT_ENTRA_ID_ID", clientId],
  ["AUTH_MICROSOFT_ENTRA_ID_SECRET", secret],
  ["AUTH_MICROSOFT_ENTRA_ID_ISSUER", issuer],
];

console.log("Microsoft Entra ID configuration\n");
for (const [key, value] of required) {
  console.log(`${value ? "✓" : "✗"} ${key}${value ? " is set" : " is missing"}`);
}

function list(value) {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const teacherPolicy = {
  roles: list(process.env.AUTH_TEACHER_ROLES),
  groups: list(process.env.AUTH_TEACHER_GROUPS),
  emails: list(process.env.AUTH_ALLOWED_EMAILS),
  domains: list(process.env.AUTH_ALLOWED_DOMAINS),
};
const teacherConfigured = Object.values(teacherPolicy).some((values) => values.length > 0);

console.log("\nTeacher access configuration");
if (!teacherConfigured) {
  console.log(
    "✗ No teacher allowlist is configured. Set AUTH_TEACHER_ROLES, " +
      "AUTH_TEACHER_GROUPS, AUTH_ALLOWED_EMAILS, or AUTH_ALLOWED_DOMAINS.",
  );
} else {
  for (const [key, values] of [
    ["AUTH_TEACHER_ROLES", teacherPolicy.roles],
    ["AUTH_TEACHER_GROUPS", teacherPolicy.groups],
    ["AUTH_ALLOWED_EMAILS", teacherPolicy.emails],
    ["AUTH_ALLOWED_DOMAINS", teacherPolicy.domains],
  ]) {
    if (values.length) console.log(`✓ ${key}: ${values.join(", ")}`);
  }
  if (teacherPolicy.domains.length) {
    console.log("! A domain allowlist may include student accounts. Prefer an app role or group.");
  }
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

const rawBaseUrl = process.env.AUTH_URL?.trim();
const missingScheme = Boolean(rawBaseUrl && !/^[a-z][a-z\d+.-]*:\/\//i.test(rawBaseUrl));
if (missingScheme) {
  console.log(
    `\n! AUTH_URL must include a scheme. Use https://${rawBaseUrl.replace(/^\/+/, "")}`,
  );
}
const baseUrl =
  (missingScheme ? `https://${rawBaseUrl.replace(/^\/+/, "")}` : rawBaseUrl)?.replace(
    /\/$/,
    "",
  ) || "http://localhost:3000";
console.log(`\nCallback URL for the Entra app registration:\n${baseUrl}/api/auth/callback/microsoft-entra-id`);

if (required.some(([, value]) => !value)) {
  console.log("\nMicrosoft sign-in is not configured. See web/AUTH_SETUP.md.");
  process.exit(1);
}

if (!teacherConfigured) {
  console.log("\nTeacher access is not configured. See web/AUTH_SETUP.md.");
  process.exit(1);
}

console.log("\nMicrosoft sign-in and teacher access configuration are present.");
