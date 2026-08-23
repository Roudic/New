import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { parseCsvText } from "@/lib/scorecard/parse-csv";
import { parseWorkbookText } from "@/lib/scorecard/parse-workbook";
import type { ParseResult } from "@/lib/scorecard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a CSV or PDF file to upload." }, { status: 400 });
  }

  const filename = file.name || "upload";
  const buffer = Buffer.from(await file.arrayBuffer());
  const lower = filename.toLowerCase();

  try {
    let parsed: ParseResult;
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const extracted = await pdf(buffer);
      parsed = parseWorkbookText(extracted.text);
    } else {
      parsed = parseCsvText(buffer.toString("utf8"));
    }

    if (
      parsed.days.length === 0 &&
      parsed.monthly.length === 0 &&
      parsed.goals.length === 0
    ) {
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
            : "Could not read that file. Try a Daily Data CSV export.",
      },
      { status: 400 }
    );
  }
}
