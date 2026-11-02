import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { getCurrentTeacher } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  return (
    <div className="app-frame min-h-dvh pb-28">
      {children}
      <BottomNav />
    </div>
  );
}
