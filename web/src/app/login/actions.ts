"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/home" });
}

export async function signInDev() {
  await signIn("dev", { redirectTo: "/home" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
