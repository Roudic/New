import type { ReactNode } from "react";
import { L10Provider } from "@/lib/useL10";

export default function L10Layout({ children }: { children: ReactNode }) {
  return <L10Provider>{children}</L10Provider>;
}
