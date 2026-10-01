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
    <div className="brain-shell">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="brain-card overflow-hidden">
            <div className="bg-gradient-to-br from-[#2c1b14] to-[#4a2a22] px-8 py-8 text-[var(--brain-cream)]">
              <div className="flex items-center gap-3">
                <div className="brain-mark" aria-hidden="true">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <p className="brain-kicker" style={{ color: "rgba(246,235,227,0.65)" }}>
                    Chick-fil-A Hueytown
                  </p>
                  <h1 className="brain-display text-2xl">Second Brain OPs</h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[var(--brain-cream)]/80">
                Manager-only. Four seats. Not JoltCheck crew login.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-8">
              <div>
                <label className="brain-field" htmlFor="brain-email">
                  Manager email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brain-taupe)]" />
                  <input
                    id="brain-email"
                    type="email"
                    className="brain-input pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="brain-field" htmlFor="brain-password">
                  Manager password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brain-taupe)]" />
                  <input
                    id="brain-password"
                    type="password"
                    className="brain-input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-[14px] border border-[#f0c3bc] bg-[#fff1ee] px-4 py-3 text-sm font-semibold text-[var(--brain-coral)]">
                  {error}
                </div>
              )}
              <button type="submit" className="brain-btn brain-btn--primary w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
