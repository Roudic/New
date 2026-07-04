"use client";

import { RunClient } from "@/components/RunClient";
import { useApp } from "@/context/AppContext";
import RunChecklistPageLocal from "./RunChecklistPageLocal";

export default function RunChecklistPage({
  params,
}: {
  params: { runId: string };
}) {
  const { storageMode } = useApp();

  if (storageMode === "cloud") {
    return <RunClient runId={params.runId} />;
  }

  return <RunChecklistPageLocal params={params} />;
}
