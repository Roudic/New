"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardList, Lock, Mail, UserCheck } from "lucide-react";
import { acceptInvite, fetchInviteDetails } from "@/lib/api-client";

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{
    name: string;
    email: string;
    jobTitle: string | null;
    locationName: string;
    invitedByName: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchInviteDetails(params.token)
      .then((data) => {
        setInvite(data);
      })
      .catch((err) => {
        setInviteError(err instanceof Error ? err.message : "This invite is not valid.");
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await acceptInvite(params.token, password, confirmPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-hero-gradient px-4 py-8">
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
                  KitchenCheck
                </p>
                <h1 className="text-2xl font-bold">Join your team</h1>
              </div>
            </div>
          </div>

          {loading && (
            <div className="p-8 text-center text-slate-500">Loading invite...</div>
          )}

          {!loading && inviteError && (
            <div className="space-y-4 p-8">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {inviteError}
              </div>
              <Link href="/login" className="btn-primary block w-full text-center">
                Go to sign in
              </Link>
            </div>
          )}

          {!loading && invite && !done && (
            <form onSubmit={handleSubmit} className="space-y-4 p-8">
              <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-5 w-5 text-brand-600" />
                  <div>
                    <p className="font-bold text-slate-900">{invite.name}</p>
                    <p className="text-sm text-slate-600">
                      {invite.jobTitle || "Kitchen Crew"} · {invite.locationName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Invited by {invite.invitedByName}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="field-label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input readOnly className="field-input pl-10" value={invite.email} />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="password">
                  Create password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    className="field-input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="confirm">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm"
                    type="password"
                    className="field-input pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Creating account..." : "Create account & join"}
              </button>
            </form>
          )}

          {done && invite && (
            <div className="space-y-4 p-8">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <p className="font-semibold text-emerald-900">You&apos;re all set, {invite.name.split(" ")[0]}!</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Sign in with <span className="font-mono">{invite.email}</span> and the password you just created.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => router.push("/login")}
              >
                Go to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
