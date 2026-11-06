"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { normalizeDevAccount } from "@/lib/dev-account";
import { DEV_SIGNED_OUT_COOKIE, isDevAuthEnabled } from "@/lib/dev-auth";

function safeRedirect(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }
  return value;
}

export async function signInWithMicrosoft(formData: FormData) {
  await signIn("microsoft-entra-id", { redirectTo: safeRedirect(formData.get("next")) });
}

/**
 * Development-only sign-in. The provider is never registered in a production
 * build, and this action refuses to run if it somehow is.
 */
export async function signInDev(formData: FormData) {
  if (!isDevAuthEnabled()) {
    throw new Error("Local development sign-in is disabled.");
  }

  const account = normalizeDevAccount({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  const redirectTo = safeRedirect(formData.get("next"));

  // A manual dev sign-in clears the sign-out opt-out so the next visit can
  // auto-sign in again.
  (await cookies()).delete(DEV_SIGNED_OUT_COOKIE);

  // Sign in without letting Auth.js redirect through AUTH_URL. A local
  // .env.local often points AUTH_URL at the deployed origin for QR links, and
  // dev sign-in must stay on localhost.
  await signIn("dev", {
    email: account.email,
    name: account.name,
    redirect: false,
    redirectTo,
  });
  redirect(redirectTo);
}

export async function signOutAction() {
  if (isDevAuthEnabled()) {
    // Stop the login page from instantly signing the local test account back
    // in after an explicit sign-out. Cleared by the next dev sign-in.
    (await cookies()).set(DEV_SIGNED_OUT_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  // Also avoid Auth.js sending a local dev session to AUTH_URL's origin.
  await signOut({ redirect: false });
  redirect("/login");
}
