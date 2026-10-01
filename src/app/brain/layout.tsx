import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./brain.css";

const brainUi = Nunito({
  subsets: ["latin"],
  variable: "--font-brain-ui",
  display: "swap",
});

const brainDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-brain-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Second Brain OPs — Hueytown managers",
};

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`brain-root ${brainUi.variable} ${brainDisplay.variable}`}>
      {children}
    </div>
  );
}
