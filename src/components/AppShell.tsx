"use client";

import { useApp } from "@/context/AppContext";
import { NavBar } from "@/components/NavBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { hydrated } = useApp();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:pb-8">
        {children}
      </main>
    </div>
  );
}
