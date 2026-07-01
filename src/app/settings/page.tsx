"use client";

import { useRouter } from "next/navigation";
import { Building2, Shield, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, resetAllData } = useApp();

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
              <h2 className="text-lg font-bold text-slate-900">{settings.employeeName}</h2>
              <p className="text-sm text-slate-500">{settings.email}</p>
            </div>
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Role</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                <Shield className="h-4 w-4 text-brand-600" />
                {settings.role === "ADMIN" ? "Administrator" : "Employee"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Location</dt>
              <dd className="mt-1">
                <label className="flex items-center gap-2 font-medium text-slate-900">
                  <Building2 className="h-4 w-4 text-brand-600" />
                  <input
                    type="text"
                    value={settings.locationName}
                    onChange={(e) => updateSettings({ locationName: e.target.value })}
                    className="field-input py-2"
                  />
                </label>
              </dd>
            </div>
          </dl>
        </div>

        <div className="glass-panel p-6 text-sm leading-relaxed text-slate-600">
          <h3 className="font-bold text-slate-900">Works on your phone instantly</h3>
          <p className="mt-3">
            No database setup required. Your checklists, assignments, and progress are saved
            in this browser on this device.
          </p>
          <p className="mt-3 font-semibold text-slate-800">Demo accounts</p>
          <ul className="mt-2 space-y-1">
            <li>Admin: admin@joltcheck.com / admin123</li>
            <li>Employee: alex@store.com / employee123</li>
            <li>Employee: sam@store.com / employee123</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset all data on this device? You will be logged out.")) {
                resetAllData();
                router.push("/login");
              }
            }}
            className="btn-danger mt-6"
          >
            Reset all data on this device
          </button>
        </div>
      </div>
    </AppShell>
  );
}
