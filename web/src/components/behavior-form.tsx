"use client";

import { Check, LoaderCircle, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveIncidentAction, type IncidentFormState } from "@/app/actions";
import type { Behavior } from "@/lib/types";

export function BehaviorForm({
  classId,
  studentId,
  behaviors,
  showSeverity,
  requireOtherNote,
}: {
  classId: string;
  studentId: string;
  behaviors: Behavior[];
  showSeverity: boolean;
  requireOtherNote: boolean;
}) {
  const [state, action, pending] = useActionState<IncidentFormState, FormData>(
    saveIncidentAction,
    null,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const positives = behaviors.filter((behavior) => behavior.tone === "positive");
  const concerns = behaviors.filter((behavior) => behavior.tone === "concern");
  const other = behaviors.find((behavior) => behavior.system);

  const selectedBehaviors = behaviors.filter((behavior) => selected.includes(behavior.id));
  const needsNote = selectedBehaviors.some(
    (behavior) => behavior.requiresNote || (behavior.system && requireOtherNote),
  );

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  return (
    <form action={action}>
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />

      <BehaviorGroup title="Positive" behaviors={positives} selected={selected} toggle={toggle} />
      <BehaviorGroup title="Concern" behaviors={concerns} selected={selected} toggle={toggle} />

      {other ? (
        <section className="mt-6">
          <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">Other</h2>
          <button
            type="button"
            onClick={() => toggle(other.id)}
            aria-pressed={selected.includes(other.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border border-dashed p-3.5 text-left ${
              selected.includes(other.id)
                ? "border-brand bg-brand-soft"
                : "border-line-strong bg-surface"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-lg">
              {other.icon}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">{other.label}</span>
              <span className="block text-[10px] text-muted">Use a note to explain what happened</span>
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                selected.includes(other.id)
                  ? "border-brand bg-brand text-white"
                  : "border-line-strong text-transparent"
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </span>
          </button>
          {selected.includes(other.id) ? <input type="hidden" name="behaviors" value={other.id} /> : null}
        </section>
      ) : null}

      {selected
        .filter((id) => id !== other?.id)
        .map((id) => (
          <input key={id} type="hidden" name="behaviors" value={id} />
        ))}

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="note" className="text-sm font-bold">
            Notes <span className="text-xs font-medium text-muted">Optional</span>
          </label>
          {needsNote ? <span className="text-[10px] font-bold text-warn">Context required</span> : null}
        </div>
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="What happened before, who else was involved, what you did next…"
          className="w-full resize-none rounded-2xl border border-line bg-surface p-3 text-base leading-6 outline-none focus:border-brand"
        />
        {needsNote && !note.trim() ? (
          <p className="mt-1.5 text-[11px] font-semibold text-warn">
            Add a short note for the selected behavior.
          </p>
        ) : null}
      </section>

      {showSeverity ? (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-bold">
            Severity <span className="text-xs font-medium text-muted">Optional</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {["low", "medium", "high"].map((value) => (
              <label
                key={value}
                className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-xs font-bold capitalize text-muted has-[:checked]:border-warn has-[:checked]:bg-warn-soft has-[:checked]:text-warn"
              >
                <input type="radio" name="severity" value={value} className="sr-only" />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state && !state.ok ? (
        <p className="mt-4 rounded-xl border border-concern/30 bg-concern-soft p-3 text-xs font-semibold text-concern">
          {state.message}
        </p>
      ) : null}

      <div className="fixed bottom-[88px] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-background/95 px-5 py-3 backdrop-blur-xl">
        <button
          type="submit"
          disabled={pending || !selected.length || (needsNote && !note.trim())}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
          {pending ? "Saving…" : "Save entry"}
        </button>
      </div>
    </form>
  );
}

function BehaviorGroup({
  title,
  behaviors,
  selected,
  toggle,
}: {
  title: string;
  behaviors: Behavior[];
  selected: string[];
  toggle: (id: string) => void;
}) {
  if (!behaviors.length) return null;

  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {behaviors.map((behavior) => {
          const isSelected = selected.includes(behavior.id);
          return (
            <button
              key={behavior.id}
              type="button"
              onClick={() => toggle(behavior.id)}
              aria-pressed={isSelected}
              className={`flex min-h-[74px] flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors ${
                isSelected
                  ? behavior.tone === "positive"
                    ? "border-positive bg-positive-soft"
                    : "border-concern bg-concern-soft"
                  : "border-line bg-surface"
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {behavior.icon}
              </span>
              <span className="text-xs font-bold leading-4">{behavior.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
