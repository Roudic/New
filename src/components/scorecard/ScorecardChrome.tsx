"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  Gauge,
  Goal,
  LineChart,
  Smile,
  Timer,
  Upload,
  CalendarRange,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";

const LINKS = [
  { href: "/scorecard", label: "Hub", icon: Gauge, exact: true },
  { href: "/scorecard/daily", label: "Daily", icon: CalendarDays },
  { href: "/scorecard/intervals", label: "15-Minute", icon: Clock },
  { href: "/scorecard/cems", label: "CEMS", icon: Smile },
  { href: "/timer", label: "Timer", icon: Timer, exact: true },
  { href: "/scorecard/drive-thru", label: "Drive-Thru", icon: Timer },
  { href: "/scorecard/monthly", label: "Monthly", icon: CalendarRange },
  { href: "/scorecard/quarterly", label: "Quarterly", icon: Layers },
  { href: "/scorecard/yoy", label: "YoY", icon: LineChart },
  { href: "/scorecard/goals", label: "Goals", icon: Goal },
  { href: "/scorecard/upload", label: "Upload", icon: Upload },
];

export function ScorecardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, isLoggedIn } = useApp();

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login");
  }, [hydrated, isLoggedIn, router]);

  if (!hydrated || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-slate-500">
        Loading scorecard…
      </div>
    );
  }

  return (
    <AppShell wide>
      <div className="mb-6 overflow-x-auto pb-1">
        <nav className="flex min-w-max items-center gap-1 rounded-2xl border border-rose-100 bg-white/90 p-1 shadow-sm">
          {LINKS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-cfa text-white shadow-sm"
                    : "text-slate-600 hover:bg-rose-50 hover:text-cfa-dark"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </AppShell>
  );
}

export function StatusChip({ status }: { status: "on_track" | "behind" | "na" }) {
  const styles = {
    on_track: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    behind: "bg-rose-50 text-rose-700 ring-rose-100",
    na: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const labels = { on_track: "On track", behind: "Behind", na: "No data" };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
