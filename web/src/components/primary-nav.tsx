"use client";

import { BarChart3, Home, ScanLine, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Teacher } from "@/lib/types";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/scan", label: "Scan", icon: ScanLine, primary: true },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNav({ teacher }: { teacher: Teacher }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/95 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/home" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-indigo-500/20">
            <ScanLine size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold tracking-tight">Offense Tracker</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Teacher workspace
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="mt-8 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? "bg-brand text-white shadow-lg shadow-indigo-500/25"
                      : "bg-brand-soft text-brand hover:bg-brand-soft/80"
                  }`}
                >
                  <Icon size={18} />
                  Scan a student
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-line bg-surface-2 p-3">
          <p className="truncate text-xs font-bold">{teacher.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted">{teacher.email}</p>
          <Link
            href="/settings"
            className="mt-2 inline-flex text-[11px] font-bold text-brand hover:underline"
          >
            Account settings
          </Link>
        </div>
      </aside>

      <nav
        aria-label="Primary"
        className="no-print fixed bottom-0 left-1/2 z-40 w-full max-w-[560px] -translate-x-1/2 border-t border-line bg-surface/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5 items-end">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="-mt-6 flex flex-col items-center gap-1"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-indigo-500/25 ring-4 ring-background">
                    <Icon size={25} />
                  </span>
                  <span className="text-[9px] font-bold text-muted">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-bold ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
