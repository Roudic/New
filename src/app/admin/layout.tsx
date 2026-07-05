"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/context/AppContext";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hydrated, isLoggedIn, settings } = useApp();

  const isAdmin = settings.role === "ADMIN";

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.replace("/login");
    } else if (!isAdmin) {
      router.replace("/employee");
    }
  }, [hydrated, isLoggedIn, isAdmin, router]);

  if (!hydrated || !isLoggedIn || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-slate-500">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
