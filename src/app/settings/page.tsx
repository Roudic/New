"use client";

import { useState } from "react";
import { Save, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [name, setName] = useState(settings.employeeName);
  const [location, setLocation] = useState(settings.locationName);
  const [saved, setSaved] = useState(false);

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
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-2 text-slate-600">
          Your name is stamped on every completed task for team accountability.
        </p>
      </section>

      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Team Profile</h2>
            <p className="text-sm text-slate-500">Used on all checklist completions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="employeeName"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Your Name
            </label>
            <input
              id="employeeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="locationName"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Location Name
            </label>
            <input
              id="locationName"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Downtown Store #042"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
