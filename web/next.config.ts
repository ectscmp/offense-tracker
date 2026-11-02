import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
