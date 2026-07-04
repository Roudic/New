"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const router = useRouter();
  const { hydrated, isLoggedIn, settings } = useApp();

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    router.replace(settings.role === "ADMIN" ? "/admin" : "/employee");
  }, [hydrated, isLoggedIn, settings.role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm font-medium text-slate-600">Loading...</p>
    </div>
  );
}
