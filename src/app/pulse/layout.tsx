import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Depart Rate",
  description: "Drive-thru pull timer and depart-rate speed of service.",
  appleWebApp: {
    capable: true,
    title: "Depart Rate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0d0f",
};

export default function PulseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0d0d0f] text-zinc-100 antialiased">{children}</div>
  );
}
