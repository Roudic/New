import { NextResponse } from "next/server";
import { DRIVE_ACL_UNWIRED, driveSharePlan } from "@/lib/second-brain/access";
import { buildBrainGraph } from "@/lib/second-brain/graph";
import { readNotes } from "@/lib/second-brain/pipeline";
import { withManagerStore } from "@/lib/second-brain/require-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await withManagerStore("read", ({ email, store }) => {
    const notes = readNotes(store, email);
    const plan = driveSharePlan(store.getRoster());
    const graph = buildBrainGraph(notes, store.getCatalog());
    return {
      actor: email,
      drive: {
        live: plan.live,
        folderId: plan.folderId,
        folderName: plan.folderName,
        message: DRIVE_ACL_UNWIRED,
      },
      ...graph,
    };
  });

  if (result instanceof NextResponse) return result;
  return NextResponse.json(result);
}
