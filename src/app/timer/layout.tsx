import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Drive-Thru Window Timer",
  description: "Time cars at the window for speed of service, car counts, and CPH.",
  appleWebApp: {
    capable: true,
    title: "Window Timer",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0d0f",
};

export default function TimerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0d0d0f] text-zinc-100 antialiased">
      {children}
    </div>
  );
}
