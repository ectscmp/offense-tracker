"use client";

import { CheckCircle2, CircleAlert, LoaderCircle, Plus, WandSparkles } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { addStudentsAction, type StudentImportState } from "@/app/actions";
import { parseBulkStudents } from "@/lib/parse-students";

const EXAMPLE = `Maya Rodriguez, 100100001
Ethan Chen, 100100002
Jordan Lee, 900000001`;

export function BulkStudentsForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState<StudentImportState, FormData>(
    addStudentsAction,
    null,
  );
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseBulkStudents(text), [text]);
  const valid = parsed.rows.filter((row) => !row.error).length;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />

      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <label htmlFor="students" className="text-xs font-bold uppercase tracking-wider text-muted">
          Students
        </label>
        <textarea
          id="students"
          name="students"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={9}
          maxLength={10000}
          spellCheck={false}
          placeholder={"Maya Rodriguez, 100100001\nEthan Chen, 100100002"}
          className="mt-2 w-full resize-y rounded-xl border border-line bg-surface p-3 font-mono text-[13px] leading-6 outline-none focus:border-brand"
        />
        <p className="mt-2 text-[11px] leading-5 text-muted">
          One student per line. Two columns: <strong>name, ID</strong>. Three columns:{" "}
          <strong>first, last, ID</strong>. Commas or tabs work.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand"
          >
            <WandSparkles size={14} />
            Use example
          </button>
          {text ? (
            <button
              type="button"
              onClick={() => setText("")}
              className="text-xs font-bold text-muted"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {text.trim() ? (
        <div className="rounded-2xl border border-line bg-surface-2 p-4 text-xs">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface p-2">
              <strong className="block text-lg">{valid}</strong>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted">ready</span>
            </div>
            <div className="rounded-xl bg-surface p-2">
              <strong className="block text-lg">{parsed.errors.length}</strong>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted">issues</span>
            </div>
            <div className="rounded-xl bg-surface p-2">
              <strong className="block text-lg">{parsed.rows.length}</strong>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted">lines</span>
            </div>
          </div>
          {parsed.errors.length ? (
            <div className="mt-3 space-y-1 text-warn">
              {parsed.errors.slice(0, 5).map((row) => (
                <p key={`${row.line}-${row.externalId}`} className="border-l-2 border-warn pl-2">
                  Line {row.line}: {row.error}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {state ? (
        <div
          className={`flex gap-2 rounded-2xl border p-3 text-xs leading-5 ${
            state.ok
              ? "border-positive/30 bg-positive-soft text-positive"
              : "border-concern/30 bg-concern-soft text-concern"
          }`}
        >
          {state.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <CircleAlert size={17} className="mt-0.5 shrink-0" />}
          <div>
            <p className="font-bold">{state.message}</p>
            {state.details?.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !parsed.rows.length || parsed.errors.length > 0}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Plus size={18} />}
        {pending ? "Adding students…" : "Add students"}
      </button>
    </form>
  );
}
