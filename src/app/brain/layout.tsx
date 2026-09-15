import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Second Brain OPs — Hueytown managers",
};

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
