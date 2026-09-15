"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Lock, Mail } from "lucide-react";

export default function BrainLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/brain/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }
      router.replace("/brain");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="glass-panel overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-8 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                    Chick-fil-A Hueytown
                  </p>
                  <h1 className="text-2xl font-bold">Second Brain OPs</h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/85">
                Manager-only. Four seats. Not JoltCheck crew login.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-8">
              <div>
                <label className="field-label" htmlFor="brain-email">
                  Manager email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="brain-email"
                    type="email"
                    className="field-input pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="brain-password">
                  Manager password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="brain-password"
                    type="password"
                    className="field-input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
