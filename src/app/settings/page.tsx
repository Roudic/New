"use client";

import { useEffect, useState } from "react";
import { Building2, Save, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [name, setName] = useState(settings.employeeName);
  const [location, setLocation] = useState(settings.locationName);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(settings.employeeName);
    setLocation(settings.locationName);
  }, [settings.employeeName, settings.locationName]);

  const handleSave = () => {
    updateSettings({
      employeeName: name.trim(),
      locationName: location.trim() || "Main Street Location",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile details appear on every completed task so your team has a clear audit trail."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass-panel p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Team Profile</h2>
              <p className="text-sm text-slate-500">
                Used on all checklist completions
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="employeeName" className="field-label">
                Your Name
              </label>
              <input
                id="employeeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="locationName" className="field-label">
                Location Name
              </label>
              <input
                id="locationName"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Downtown Store #042"
                className="field-input"
              />
            </div>

            <button type="button" onClick={handleSave} className="btn-primary">
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-bold text-slate-900">Why this matters</h3>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
            <li>Your name is stamped on every task you complete.</li>
            <li>Location name appears on the dashboard for shift context.</li>
            <li>Data stays in this browser until you deploy or clear storage.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
