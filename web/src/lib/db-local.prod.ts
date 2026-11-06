/**
 * Production alias for the development-only JSON store.
 *
 * `next.config.ts` replaces `@/lib/db-local` with this module in production
 * builds, so the local filesystem store is never bundled or loaded by a
 * deployed app. The store switch in `@/lib/store` never selects this module
 * outside `next dev`.
 */
export {};
