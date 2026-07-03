"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Link2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function InviteTeamPage() {
  const router = useRouter();
  const { inviteTeamMember, settings, storageMode } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [locationName, setLocationName] = useState(settings.locationName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (storageMode !== "cloud") {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Team"
          title="Invite Crew Member"
          description="Cloud database required for team invites."
          backHref="/admin/team"
          backLabel="Team"
        />
        <div className="glass-panel p-6 text-slate-600">
          Connect the app to your cloud database to invite real team members.
        </div>
      </AppShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setCopied(false);

    try {
      const invite = await inviteTeamMember({
        name: name.trim(),
        email: email.trim(),
        jobTitle: jobTitle.trim() || undefined,
        locationName: locationName.trim() || undefined,
        role: "EMPLOYEE",
      });
      setInviteUrl(invite.inviteUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invite.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invite link:", inviteUrl);
    }
  };

  const shareText = inviteUrl
    ? `Hi ${name.split(" ")[0] || "there"}! Join our KitchenCheck team and set your password here: ${inviteUrl}`
    : "";

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this message:", shareText);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Team"
        title="Invite Crew Member"
        description="Send a link so they can create their password and sign in on their phone."
        backHref="/admin/team"
        backLabel="Team"
      />

      {!inviteUrl ? (
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
              placeholder="Alex Rivera"
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
              placeholder="alex@yourkitchen.com"
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
              placeholder="Line Cook"
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

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            <UserPlus className="h-4 w-4" />
            {submitting ? "Creating invite..." : "Create invite link"}
          </button>
        </form>
      ) : (
        <div className="glass-panel max-w-xl space-y-5 p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="font-semibold text-emerald-900">Invite ready for {name}</p>
            <p className="mt-1 text-sm text-emerald-800">
              Text or share this link — they&apos;ll set a password and can sign in immediately.
            </p>
          </div>

          <div>
            <label className="field-label">Invite link</label>
            <div className="flex gap-2">
              <input readOnly className="field-input text-sm" value={inviteUrl} />
              <button type="button" className="btn-secondary shrink-0" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="field-label">Ready-to-send text message</label>
            <textarea readOnly className="field-input min-h-[96px] text-sm" value={shareText} />
            <button type="button" className="btn-secondary mt-2 w-full" onClick={copyShareText}>
              <Link2 className="h-4 w-4" />
              Copy text message
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/team/invite" className="btn-secondary" onClick={() => setInviteUrl(null)}>
              Invite another
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
