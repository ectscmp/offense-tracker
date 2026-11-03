import { redirect } from "next/navigation";
import { resolveScannedStudent } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Student QR link",
};

/**
 * Short link printed on QR cards. Any camera app can open it, and after sign-in
 * it lands on that student's behavior form. Unknown tokens fall back to the
 * scan screen so the teacher can search the roster instead.
 */
export default async function StudentShortLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    const target = `/s/${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  const resolved = await resolveScannedStudent(teacher.id, token);
  if (!resolved) redirect(`/scan?code=${encodeURIComponent(token)}`);

  redirect(`/student/${resolved.student.id}`);
}
