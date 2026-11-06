"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";
import { updateStudentAction, type StudentEditState } from "@/app/actions";
import type { Student } from "@/lib/types";

export function StudentEditForm({ student }: { student: Student }) {
  const [state, action, pending] = useActionState<StudentEditState, FormData>(
    updateStudentAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={student.id} />

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-muted">First name</span>
          <input
            name="firstName"
            required
            maxLength={60}
            defaultValue={student.firstName}
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-muted">Last name</span>
          <input
            name="lastName"
            required
            maxLength={60}
            defaultValue={student.lastName}
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-bold text-muted">Student ID</span>
        <input
          name="externalId"
          required
          maxLength={60}
          defaultValue={student.externalId}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-line bg-surface px-3 font-mono text-base outline-none focus:border-brand"
        />
        <span className="mt-1.5 block text-[11px] leading-5 text-muted">
          The ID is shared across your classes, so it must be unique. Changing it does not alter
          past entries.
        </span>
      </label>

      {state && !state.ok ? (
        <p className="rounded-xl border border-concern/30 bg-concern-soft p-3 text-xs font-semibold text-concern">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
