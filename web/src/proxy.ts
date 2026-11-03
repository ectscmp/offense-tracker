import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { SECURITY_HEADERS } from "@/lib/security-headers";

function intFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

// General pages, route handlers, and server actions.
const APP_LIMIT = intFromEnv("RATE_LIMIT_MAX", 300);
const APP_WINDOW_MS = intFromEnv("RATE_LIMIT_WINDOW_MS", 60_000);

// Auth.js routes are more sensitive, so they get a smaller budget.
const AUTH_LIMIT = intFromEnv("AUTH_RATE_LIMIT_MAX", 60);
const AUTH_WINDOW_MS = intFromEnv("AUTH_RATE_LIMIT_WINDOW_MS", 5 * 60_000);

function clientAddress(request: NextRequest) {
  // Railway and most reverse proxies set X-Forwarded-For. If the app is ever
  // exposed directly, untrusted clients can spoof this header; put it behind a
  // proxy that overwrites X-Forwarded-For before relying on it.
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  if (firstForwarded) return firstForwarded;

  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function withResponseHeaders(response: NextResponse, result?: RateLimitResult) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (result) {
    response.headers.set("RateLimit-Limit", String(result.limit));
    response.headers.set("RateLimit-Remaining", String(result.remaining));
    response.headers.set(
      "RateLimit-Reset",
      String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))),
    );
  }

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Platform healthchecks should never consume the budget.
  if (pathname === "/api/health") {
    return withResponseHeaders(NextResponse.next());
  }

  // Link prefetches are speculative; don't let them exhaust a real user's budget.
  if (
    request.headers.get("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return withResponseHeaders(NextResponse.next());
  }

  const isAuthRoute = pathname.startsWith("/api/auth");
  const result = checkRateLimit(
    `${isAuthRoute ? "auth" : "app"}:${clientAddress(request)}`,
    isAuthRoute ? AUTH_LIMIT : APP_LIMIT,
    isAuthRoute ? AUTH_WINDOW_MS : APP_WINDOW_MS,
  );

  if (!result.allowed) {
    const response = new NextResponse(
      "Too many requests. Please wait and try again.\n",
      {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": String(result.retryAfterSeconds),
        },
      },
    );
    return withResponseHeaders(response, result);
  }

  return withResponseHeaders(NextResponse.next(), result);
}

export const config = {
  matcher: [
    // Apply to every route except build assets and static files. Server actions
    // POST to their page route, so they remain covered by this matcher.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
