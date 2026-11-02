"use client";

import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import { selectClassAction } from "@/app/actions";
import { classLabel } from "@/lib/format";
import type { Classroom } from "@/lib/types";

export function ClassSwitcher({
  classes,
  activeId,
  counts,
}: {
  classes: Classroom[];
  activeId: string;
  counts: Record<string, number>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={selectClassAction} className="relative">
      <label htmlFor="class-switcher" className="sr-only">
        Current class
      </label>
      <select
        id="class-switcher"
        name="classId"
        defaultValue={activeId}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full appearance-none rounded-2xl border border-line bg-surface py-3 pl-4 pr-11 text-left text-sm font-semibold shadow-sm outline-none focus:border-brand"
      >
        {classes.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classLabel(classroom)} · {counts[classroom.id] ?? 0} students
          </option>
        ))}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </form>
  );
}
