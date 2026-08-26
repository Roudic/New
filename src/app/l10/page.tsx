import type { Metadata } from "next";
import { HubClient } from "./HubClient";

export const metadata: Metadata = {
  title: "L10 Meetings — Level 10",
  description: "Prep, run, and follow up on weekly Level 10 leadership meetings.",
};

export default function L10HubPage() {
  return <HubClient />;
}
