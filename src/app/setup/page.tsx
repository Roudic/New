"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";

export default function SetupPage() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "x-setup-secret": secret.trim() },
      });
      const data = await res.json();

      if (res.ok || res.status === 409) {
        setStatus("success");
        setMessage(
          res.status === 409
            ? "Database was already set up. You can sign in now."
            : "Database ready! Demo accounts created."
        );
        return;
      }

      setStatus("error");
      setMessage(data.error ?? "Setup failed. Check your setup secret.");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again in a moment.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-hero-gradient px-4">
      <div className="relative w-full max-w-md">
        <div className="glass-panel overflow-hidden">
          <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">One-time setup</h1>
                <p className="text-sm text-white/85">Works on your phone — no computer needed</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>
                In Vercel → Environment Variables, add{" "}
                <code className="rounded bg-slate-100 px-1">SETUP_SECRET</code> (any password you
                choose)
              </li>
              <li>Redeploy the app in Vercel</li>
              <li>Enter that same password below and tap Set up</li>
            </ol>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="secret">
                  Setup secret
                </label>
                <input
                  id="secret"
                  type="password"
                  className="field-input"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Same as SETUP_SECRET in Vercel"
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Set up database"
                )}
              </button>
            </form>

            {message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  status === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {message}
                {status === "success" && (
                  <Link href="/login" className="mt-3 block font-bold text-brand-600">
                    Go to login →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
