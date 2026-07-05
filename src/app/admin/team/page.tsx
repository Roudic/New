"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Clock,
  Link2,
  Mail,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { formatDateTime } from "@/lib/utils";

export default function AdminTeamPage() {
  const {
    assignments,
    getEmployees,
    getTeamMembers,
    pendingInvites,
    cancelInvite,
    removeTeamMember,
    storageMode,
    settings,
  } = useApp();
  const employees = getEmployees();
  const teamMembers = getTeamMembers();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const crewStats = useMemo(() => {
    return employees.map((employee) => {
      const mine = assignments.filter((a) => a.assignedToEmail === employee.email);
      const pending = mine.filter((a) => a.status === "pending").length;
      const active = mine.filter((a) => a.status === "in_progress").length;
      const done = mine.filter((a) => a.status === "completed").length;
      return {
        ...employee,
        pending,
        active,
        done,
        total: mine.length,
      };
    });
  }, [employees, assignments]);

  const handleCancelInvite = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      await cancelInvite(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel invite.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? They will lose access.`)) return;
    setError(null);
    setBusyId(id);
    try {
      await removeTeamMember(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove team member.");
    } finally {
      setBusyId(null);
    }
  };

  const copyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Crew"
        title="Team Management"
        description="Invite real crew members, manage access, and assign kitchen audits."
        backHref="/admin"
        backLabel="Dashboard"
        action={
          storageMode === "cloud" ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/team/add" className="btn-secondary">
                Add manually
              </Link>
              <Link href="/admin/team/invite" className="btn-primary">
                <UserPlus className="h-4 w-4" />
                Invite crew
              </Link>
            </div>
          ) : (
            <Link href="/admin/assign" className="btn-primary">
              Assign Audit
            </Link>
          )
        }
      />

      {storageMode === "local" && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Demo mode — team invites work when the app is connected to your cloud database.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {storageMode === "cloud" && pendingInvites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            Pending Invites
          </h2>
          <div className="grid gap-3">
            {pendingInvites.map((invite) => (
              <article key={invite.id} className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{invite.name}</p>
                  <p className="text-sm text-slate-500">{invite.email}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    Expires {formatDateTime(invite.expiresAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary py-2 text-sm"
                    onClick={() => copyInviteLink(invite.inviteUrl)}
                  >
                    <Link2 className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="btn-secondary py-2 text-sm text-rose-600 hover:bg-rose-50"
                    disabled={busyId === invite.id}
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {storageMode === "cloud" && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            All Team Members
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {teamMembers.map((member) => (
              <article key={member.email} className="glass-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      {member.role === "ADMIN" ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <UserCheck className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{member.name}</h3>
                      <p className="text-sm text-brand-700">
                        {member.jobTitle || (member.role === "ADMIN" ? "Manager" : "Kitchen Staff")}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Mail className="h-3.5 w-3.5" />
                        {member.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{member.locationName}</p>
                    </div>
                  </div>
                  {member.id && member.email !== settings.email && member.role !== "ADMIN" && (
                    <button
                      type="button"
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      disabled={busyId === member.id}
                      onClick={() => handleRemoveMember(member.id!, member.name)}
                      aria-label={`Remove ${member.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            Crew Assignments
          </h2>
          <Link href="/admin/assign" className="text-sm font-semibold text-brand-600">
            Assign audit
          </Link>
        </div>

        {crewStats.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-500">
            No crew members yet. Invite your kitchen staff to start assigning audits.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {crewStats.map((member) => (
              <article key={member.email} className="glass-panel p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-900">{member.name}</h2>
                    <p className="text-sm font-medium text-brand-700">
                      {member.jobTitle || "Kitchen Staff"}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-amber-50 py-2">
                    <p className="text-lg font-bold text-amber-700">{member.pending}</p>
                    <p className="text-amber-600">Pending</p>
                  </div>
                  <div className="rounded-xl bg-sky-50 py-2">
                    <p className="text-lg font-bold text-sky-700">{member.active}</p>
                    <p className="text-sky-600">Active</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 py-2">
                    <p className="text-lg font-bold text-emerald-700">{member.done}</p>
                    <p className="text-emerald-600">Done</p>
                  </div>
                </div>

                <Link
                  href={`/admin/assign?employee=${encodeURIComponent(member.email)}`}
                  className="btn-secondary mt-4 w-full text-sm"
                >
                  Assign audit to {member.name.split(" ")[0]}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
