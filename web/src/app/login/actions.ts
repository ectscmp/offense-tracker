"use server";

import { signIn, signOut } from "@/auth";

function safeRedirect(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }
  return value;
}

export async function signInWithMicrosoft(formData: FormData) {
  await signIn("microsoft-entra-id", { redirectTo: safeRedirect(formData.get("next")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
