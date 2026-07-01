"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Lock, Mail } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, settings } = useApp();
  const [email, setEmail] = useState("admin@joltcheck.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  if (isLoggedIn) {
    router.replace(settings.role === "ADMIN" ? "/admin" : "/employee");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const ok = login(email, password);
    if (!ok) {
      setError("Invalid email or password.");
      return;
    }

    const user = email.toLowerCase().includes("admin") ? "/admin" : "/employee";
    router.push(user);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-hero-gradient px-4">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="relative w-full max-w-md">
        <div className="glass-panel overflow-hidden">
          <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-8 py-8 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  JoltCheck
                </p>
                <h1 className="text-2xl font-bold">Sign in</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              Works instantly on your phone — no database setup required. Data
              saves on this device.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-8">
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  className="field-input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  className="field-input pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              Sign In
            </button>
          </form>

          <div className="border-t border-slate-100 bg-slate-50/80 px-8 py-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Demo accounts</p>
            <p className="mt-2">
              Admin: <span className="font-mono text-xs">admin@joltcheck.com</span> /{" "}
              <span className="font-mono text-xs">admin123</span>
            </p>
            <p className="mt-1">
              Employee: <span className="font-mono text-xs">alex@store.com</span> /{" "}
              <span className="font-mono text-xs">employee123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
