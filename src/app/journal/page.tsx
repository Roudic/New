import type { Metadata } from "next";
import { JournalClient } from "./JournalClient";

export const metadata: Metadata = {
  title: "Journal — Notes & Reflections",
};

export default function JournalPage() {
  return <JournalClient />;
}
