import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { parseScorecardText } from "@/lib/scorecard/parse";
import { hasParseableContent, type ParseResult } from "@/lib/scorecard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a CSV, PDF, or text file to upload." }, { status: 400 });
  }

  const filename = file.name || "upload";
  const buffer = Buffer.from(await file.arrayBuffer());
  const lower = filename.toLowerCase();

  try {
    let parsed: ParseResult;
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const extracted = await pdf(buffer);
      parsed = parseScorecardText(extracted.text, filename);
    } else {
      parsed = parseScorecardText(buffer.toString("utf8"), filename);
    }

    if (!hasParseableContent(parsed)) {
      return NextResponse.json(
        {
          error: "No scorecard rows were found in that file.",
          parsed,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ parsed, filename });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read that file. Try a Daily Data, 15-minute, CEMS, or SOS export.",
      },
      { status: 400 }
    );
  }
}
