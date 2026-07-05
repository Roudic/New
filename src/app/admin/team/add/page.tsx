"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function AddTeamMemberPage() {
  const router = useRouter();
  const { addTeamMember, settings, storageMode } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [locationName, setLocationName] = useState(settings.locationName);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword?: string; message: string } | null>(null);

  if (storageMode !== "cloud") {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Team"
          title="Add Team Member"
          description="Cloud database required."
          backHref="/admin/team"
          backLabel="Team"
        />
        <div className="glass-panel p-6 text-slate-600">
          Connect the app to your cloud database to add real team members.
        </div>
      </AppShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const created = await addTeamMember({
        name: name.trim(),
        email: email.trim(),
        jobTitle: jobTitle.trim() || undefined,
        locationName: locationName.trim() || undefined,
        password: password.trim() || undefined,
        role: "EMPLOYEE",
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add team member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Team"
        title="Add Team Member"
        description="Create an account directly — useful if you want to hand them a temp password in person."
        backHref="/admin/team"
        backLabel="Team"
      />

      {!result ? (
        <form onSubmit={handleSubmit} className="glass-panel max-w-xl space-y-5 p-6">
          <div>
            <label className="field-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="jobTitle">
              Job title
            </label>
            <input
              id="jobTitle"
              className="field-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Prep Cook"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="location">
              Kitchen location
            </label>
            <input
              id="location"
              className="field-input"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Password (optional)
            </label>
            <input
              id="password"
              type="text"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to auto-generate"
            />
            <p className="mt-2 text-xs text-slate-500">
              If left blank, a temporary password will be generated for you to share.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            <UserPlus className="h-4 w-4" />
            {submitting ? "Adding..." : "Add team member"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Prefer a self-service link?{" "}
            <Link href="/admin/team/invite" className="font-semibold text-brand-600">
              Send an invite instead
            </Link>
          </p>
        </form>
      ) : (
        <div className="glass-panel max-w-xl space-y-5 p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="font-semibold text-emerald-900">{result.message}</p>
            <p className="mt-1 text-sm text-emerald-800">
              Share these login details with {name}. They can change their password later in settings.
            </p>
          </div>

          <div>
            <label className="field-label">Email</label>
            <input readOnly className="field-input" value={email} />
          </div>

          {result.tempPassword && (
            <div>
              <label className="field-label">Temporary password</label>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <code className="rounded-xl bg-slate-100 px-4 py-3 font-mono text-sm">
                  {result.tempPassword}
                </code>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/team/add" className="btn-secondary" onClick={() => setResult(null)}>
              Add another
            </Link>
            <button type="button" className="btn-primary" onClick={() => router.push("/admin/team")}>
              Back to team
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
