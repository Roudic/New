"use client";

import { useApp } from "@/context/AppContext";
import { NavBar } from "@/components/NavBar";

export function AppShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { hydrated, isLoggedIn } = useApp();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-hero-gradient">
        <div className="glass-panel px-8 py-6 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="relative">
        <NavBar />
        <main
          className={`mx-auto px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 md:pb-10 ${
            wide ? "max-w-7xl" : "max-w-6xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
