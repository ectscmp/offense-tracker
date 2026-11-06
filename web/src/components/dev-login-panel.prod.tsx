/**
 * Production alias for the development-only sign-in panel.
 *
 * `next.config.ts` replaces `@/components/dev-login-panel` with this module in
 * production builds so the local-account UI is not shipped to a deployed app.
 */
export function DevLoginPanel() {
  return null;
}
