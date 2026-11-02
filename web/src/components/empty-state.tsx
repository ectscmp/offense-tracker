import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-7 text-center">
      <Icon className="mx-auto mb-3 text-muted" size={28} aria-hidden="true" />
      <strong className="block text-sm">{title}</strong>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted">{children}</p>
    </div>
  );
}
