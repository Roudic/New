"use client";

import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";

export default function BrainOpenBanner({ dark = false }: { dark?: boolean }) {
  if (BRAIN_LOGIN_ENABLED) return null;
  return (
    <div
      id="brain-login-off"
      className={dark ? "brain-banner brain-banner--open-night" : "brain-banner brain-banner--open"}
    >
      Login is off — manager dashboard is open
    </div>
  );
}
