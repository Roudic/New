"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  NotebookPen,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, logout } = useApp();
  const isAdmin = settings.role === "ADMIN";

  const navItems = isAdmin
    ? [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/assignments", label: "Assignments", icon: ListChecks },
        { href: "/admin/team", label: "Team", icon: Users },
        { href: "/checklists", label: "Audits", icon: ClipboardList },
        { href: "/journal", label: "Journal", icon: NotebookPen },
      ]
    : [
        { href: "/employee", label: "My Tasks", icon: LayoutDashboard },
        { href: "/journal", label: "Journal", icon: NotebookPen },
        { href: "/history", label: "History", icon: ClipboardList },
        { href: "/settings", label: "Settings", icon: Settings },
      ];

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={isAdmin ? "/admin" : "/employee"} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">
                KitchenCheck
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isAdmin ? "Manager" : "Crew"}
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <span className="mr-2 text-sm font-medium text-slate-600">
              {settings.employeeName}
            </span>
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ${
                    active
                      ? "bg-brand-50 text-brand-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/checklists/new" className="btn-primary ml-1 py-2">
                <Plus className="h-4 w-4" />
                Create
              </Link>
            )}
            <button type="button" onClick={handleLogout} className="btn-secondary ml-1 py-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold ${
                  active ? "text-brand-600" : "text-slate-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
