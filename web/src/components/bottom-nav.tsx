"use client";

import { BarChart3, Home, ScanLine, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/scan", label: "Scan", icon: ScanLine, primary: true },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="no-print fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
    >
      <div className="grid grid-cols-5 items-end">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
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
  );
}
