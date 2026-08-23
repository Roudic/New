import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ScorecardChrome } from "@/components/scorecard/ScorecardChrome";

export const metadata: Metadata = {
  title: "Chick-fil-A Hueytown Scorecard",
  description: "Daily, monthly, and drive-thru scorecard for Chick-fil-A Hueytown.",
};

export default function ScorecardLayout({ children }: { children: ReactNode }) {
  return <ScorecardChrome>{children}</ScorecardChrome>;
}
