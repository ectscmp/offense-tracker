import { ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PrintButton } from "@/components/print-button";
import { getAppOrigin, studentQrUrl } from "@/lib/app-url";
import { classLabel, classShort, nameOf } from "@/lib/format";
import { getRoster, getSelectedClass } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/session";

export const metadata = {
  title: "Print QR cards",
};

export default async function PrintQrPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const classroom = await getSelectedClass(teacher.id);
  if (!classroom) redirect("/home");

  const origin = await getAppOrigin();
  const roster = await getRoster(teacher.id, classroom.id);
  const cards = await Promise.all(
    roster.map(async (student) => ({
      student,
      qr: await QRCode.toDataURL(
        origin ? studentQrUrl(origin, student.qrToken) : `ot://student/${student.qrToken}`,
        {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M",
        },
      ),
    })),
  );

  return (
    <main className="print-page px-5 pb-8 pt-5 lg:px-10 lg:py-10">
      <header className="no-print flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/roster"
            aria-label="Back to roster"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              {classLabel(classroom)}
            </p>
            <h1 className="text-2xl font-extrabold tracking-[-0.04em]">QR cards</h1>
          </div>
        </div>
        <PrintButton />
      </header>

      <div className="no-print mt-4 rounded-2xl border border-line bg-surface p-4 text-[11px] leading-5 text-muted">
        Each code is a link to this site that opens the student’s form after sign-in, so
        any phone camera can scan it. Codes are opaque and tied to this teacher account,
        not the student ID. Print on 2×6 labels or card stock.
      </div>

      <h2 className="mt-6 hidden text-sm font-bold print:block">
        {classLabel(classroom)} · student QR cards
      </h2>

      {cards.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 print:mt-3 print:grid-cols-2 print:gap-4">
          {cards.map(({ student, qr }) => (
            <article
              key={student.id}
              className="print-card break-inside-avoid rounded-2xl border border-dashed border-line-strong bg-surface p-3 text-center print:border-gray-300 print:p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={`QR code for ${nameOf(student)}`}
                width={160}
                height={160}
                className="mx-auto aspect-square w-full max-w-[150px]"
              />
              <p className="mt-2 truncate text-[11px] font-extrabold print:text-[10px]">
                {nameOf(student)}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                {classShort(classroom)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState icon={QrCode} title="No QR cards yet">
            Add students to this class first.
          </EmptyState>
        </div>
      )}
    </main>
  );
}
