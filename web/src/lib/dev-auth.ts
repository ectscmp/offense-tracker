import "server-only";

/**
 * Local-only sign-in bypass for development.
 *
 * This is intentionally gated on `NODE_ENV === "development"`, which `next
 * build`/`next start` can never satisfy. Do not replace this with an env flag
 * that can be enabled in a deployed environment.
 */
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Set when the teacher signs out in development so the login page does not
 * immediately sign the local test account back in.
 */
export const DEV_SIGNED_OUT_COOKIE = "offense-tracker.dev-signed-out";
