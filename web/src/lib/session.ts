import { auth } from "@/auth";
import { ensureTeacher } from "@/lib/db";
import type { Teacher } from "@/lib/types";

export async function getCurrentTeacher(): Promise<Teacher | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return ensureTeacher({
    email,
    name: session.user?.name || email.split("@")[0],
  });
}
