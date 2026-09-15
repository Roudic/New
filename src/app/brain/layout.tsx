import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Second Brain OPs — Hueytown managers",
};

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="relative">{children}</div>
    </div>
  );
}
