"use client";

import type { ReactNode } from "react";

export function ConfirmForm({
  action,
  confirmMessage,
  hidden = {},
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  hidden?: Record<string, string>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={className}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
    </form>
  );
}
