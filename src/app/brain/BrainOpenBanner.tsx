"use client";

import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";

export default function BrainOpenBanner({ dark = false }: { dark?: boolean }) {
  if (BRAIN_LOGIN_ENABLED) return null;
  return (
    <div
      id="brain-login-off"
      className={
        dark
          ? "border-b border-sky-900/50 bg-sky-950/50 px-4 py-2 text-sm font-medium text-sky-100"
          : "mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950"
      }
    >
      Login is off — manager dashboard is open
    </div>
  );
}
