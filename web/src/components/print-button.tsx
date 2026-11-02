"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-10 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white"
    >
      <Printer size={16} />
      Print
    </button>
  );
}
