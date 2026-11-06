import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

// Development-only modules are replaced with tiny stubs in production builds so
// the local JSON store and dev sign-in UI cannot ship to a deployed app.
const productionOnlyAliases: Record<string, string> =
  process.env.NODE_ENV === "production"
    ? {
        "@/lib/db-local": "./src/lib/db-local.prod.ts",
        "@/components/dev-login-panel": "./src/components/dev-login-panel.prod.tsx",
      }
    : {};

const nextConfig: NextConfig = {
  // Do not advertise the framework in responses.
  poweredByHeader: false,
  // Authentication and the database are request-time concerns for this build.
  // Cache Components can be adopted route-by-route once the data layer changes again.
  cacheComponents: false,
  partialPrefetching: false,
  // The MongoDB driver ships optional native bindings; keep it out of the bundle.
  serverExternalPackages: ["mongodb"],
  // Railway may build from the repository root, where the prototype's install
  // leaves a second lockfile. Pin tracing to this app directory.
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    resolveAlias: productionOnlyAliases,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
