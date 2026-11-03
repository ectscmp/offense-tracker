import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PrimaryNav } from "@/components/primary-nav";
import { getCurrentTeacher } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  return (
    <div className="app-frame min-h-dvh pb-28 lg:pb-0 lg:pl-64">
      <PrimaryNav teacher={teacher} />
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
