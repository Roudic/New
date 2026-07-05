import type { Metadata } from "next";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "AI Dashboard — Journal Insights",
};

export default function JournalDashboardPage() {
  return <DashboardClient />;
}
