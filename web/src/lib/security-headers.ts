// Shared by next.config.ts (all responses) and proxy.ts (responses created
// before a route runs, such as rate-limit rejections).
//
// The CSP intentionally allows inline scripts and styles because the App Router
// emits inline bootstrap scripts. A nonce-based policy would require every page
// to be dynamically rendered; that can be adopted later without changing the
// other headers here.
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
].join("; ");

export const SECURITY_HEADERS = {
  "Content-Security-Policy": contentSecurityPolicy,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-DNS-Prefetch-Control": "off",
  // Ignored by browsers on plain HTTP, so it is safe for local development.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  // Camera access is required for the ZXing scanner; everything else is denied.
  "Permissions-Policy":
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
} as const;
