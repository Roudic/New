"use client";

import { useSession } from "next-auth/react";
import { Building2, Shield, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account"
        title="Your Profile"
        description="Your account details used for checklist accountability."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{session?.user?.name}</h2>
              <p className="text-sm text-slate-500">{session?.user?.email}</p>
            </div>
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Role</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                <Shield className="h-4 w-4 text-brand-600" />
                {session?.user?.role === "ADMIN" ? "Administrator" : "Employee"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Location</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                <Building2 className="h-4 w-4 text-brand-600" />
                {session?.user?.locationName}
              </dd>
            </div>
          </dl>
        </div>

        <div className="glass-panel p-6 text-sm leading-relaxed text-slate-600">
          <h3 className="font-bold text-slate-900">How accounts work</h3>
          <p className="mt-3">
            Admins create assignments and track team progress from the admin dashboard.
            Employees sign in to see assigned checklists and complete tasks with
            timestamped accountability.
          </p>
          <p className="mt-3">
            Contact your administrator to update your profile or reset your password.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
