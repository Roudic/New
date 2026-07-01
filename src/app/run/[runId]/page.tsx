import { RunClient } from "@/components/RunClient";

export default function RunChecklistPage({
  params,
}: {
  params: { runId: string };
}) {
  return <RunClient runId={params.runId} />;
}
