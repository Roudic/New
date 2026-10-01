import { NextResponse } from "next/server";
import { DRIVE_ACL_UNWIRED, driveSharePlan } from "@/lib/second-brain/access";
import { integrationPanelState } from "@/lib/second-brain/integrations";
import { readNotes } from "@/lib/second-brain/pipeline";
import { withManagerStore } from "@/lib/second-brain/require-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await withManagerStore("read", ({ email, store }) => {
    const notes = readNotes(store, email);
    const plan = driveSharePlan(store.getRoster());
    return {
      actor: email,
      drive: {
        live: plan.live,
        folderId: plan.folderId,
        folderName: plan.folderName,
        anyoneWithLink: plan.anyoneWithLink,
        shareWithStoreTeam: plan.shareWithStoreTeam,
        message: DRIVE_ACL_UNWIRED,
      },
      seats: store.getRoster().managers,
      howPendingManagersGetAccess: store.getRoster().howPendingManagersGetAccess,
      inbox: notes.filter((note) => note.status === "inbox"),
      needsReview: notes.filter((note) => note.status === "needs-review"),
      filed: notes.filter((note) => note.status === "filed"),
      integrations: {
        drive: {
          panel: integrationPanelState("drive"),
          files: store.getCatalog().filter((file) => file.simulated !== true),
        },
        calendar: {
          panel: integrationPanelState("calendar"),
          events: store.getCalendarEvents(),
        },
        notion: {
          panel: integrationPanelState("notion"),
          pages: store.getNotionPages(),
        },
      },
    };
  });

  if (result instanceof NextResponse) return result;
  return NextResponse.json(result);
}
