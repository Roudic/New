"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { CEMS_CSV_TEMPLATE } from "@/lib/scorecard/parse-cems";
import { OSAT_ATTRIBUTES } from "@/lib/scorecard/types";
import {
  DAILY_CSV_TEMPLATE,
  GOALS_CSV_TEMPLATE,
  MONTHLY_CSV_TEMPLATE,
} from "@/lib/scorecard/parse-csv";
import { INTERVAL_CSV_TEMPLATE } from "@/lib/scorecard/parse-interval";
import { decodeTextBuffer } from "@/lib/scorecard/decode-text";
import { shouldSendToServer } from "@/lib/scorecard/decode-upload";
import { parseScorecardText } from "@/lib/scorecard/parse";
import { formatScore, formatSos } from "@/lib/scorecard/format";
import { hasParseableContent, type ParseResult } from "@/lib/scorecard/types";

export default function UploadScorecardPage() {
  const { applyParse, resetToSeed, state, saving } = useScorecard();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [preview, setPreview] = useState<{ parsed: ParseResult; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const parseOnServer = async (file: File) => {
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/scorecard/parse", { method: "POST", body });
    const json = (await res.json()) as { parsed?: ParseResult; error?: string; filename?: string };
    if (!res.ok || !json.parsed) {
      throw new Error(json.error ?? "Could not read that file.");
    }
    return { parsed: json.parsed, filename: json.filename ?? (file.name || "upload") };
  };

  const parseFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(null);
    setPreview(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const name = file.name || "phone-upload.csv";
      if (shouldSendToServer(name, file.type, bytes)) {
        setPreview(await parseOnServer(file));
        return;
      }
      const text = decodeTextBuffer(buffer);
      let parsed = parseScorecardText(text, name);
      if (!hasParseableContent(parsed)) {
        try {
          setPreview(await parseOnServer(file));
          return;
        } catch {
          throw new Error(
            parsed.warnings[0]?.message ??
              "That file was not understood. Export as CSV or Excel and pick it from Files (not a photo of the report)."
          );
        }
      }
      setPreview({ parsed, filename: name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await applyParse(preview.parsed, preview.filename, mode);
      const { parsed } = preview;
      const osatDays = parsed.days.filter((d) => d.osat != null).length;
      const sosDays = parsed.days.filter((d) => d.dtSosTotalSec != null).length;
      setDone(
        `Imported ${parsed.days.length} daily rows, ${parsed.intervals.length} intervals, ${osatDays} CEMS/OSAT days, ${sosDays} SOS days, ${parsed.monthly.length} monthly overlays, ${parsed.goals.length} goal years from ${preview.filename}.`
      );
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save imported data.");
    } finally {
      setBusy(false);
    }
  };

  const osatDays = preview?.parsed.days.filter((d) => d.osat != null).length ?? 0;
  const sosDays = preview?.parsed.days.filter((d) => d.dtSosTotalSec != null).length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Upload CSV or PDF"
        description="From a phone: tap Choose file, open Files, and pick the export — not a photo. 15-minute and Daily Data are CSV/Excel. CEMS is a PDF from email or Pathway, not a spreadsheet. Each 15-minute sales row is added up to that day's total sales."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void parseFile(file);
        }}
        className={`glass-panel mb-6 flex flex-col items-center justify-center border-2 border-dashed px-6 py-12 text-center ${
          dragOver ? "border-cfa bg-rose-50" : "border-slate-200"
        }`}
      >
        <Upload className="h-10 w-10 text-cfa" />
        <p className="mt-3 font-semibold text-slate-900">Upload CSV, Excel, or PDF</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          iPhone/Android: use <span className="font-semibold">Files</span> or email Downloads — not the
          camera. Sales files are CSV/Excel. CEMS is the PDF report. 15-minute sales add up to the day.
        </p>
        <label className={`btn-primary mt-4 bg-cfa hover:bg-cfa-dark ${busy ? "pointer-events-none opacity-70" : ""}`}>
          {busy ? "Reading file…" : "Choose file from phone"}
          <input
            type="file"
            className="sr-only"
            accept=".csv,.tsv,.txt,.xls,.xlsx,.xlsm,.pdf,text/csv,text/tab-separated-values,text/plain,text/comma-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,*/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void parseFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="radio"
            name="mode"
            checked={mode === "merge"}
            onChange={() => setMode("merge")}
          />
          Merge by date (keeps older days)
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="radio"
            name="mode"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          Replace this section
        </label>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      {done && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {done}
        </p>
      )}

      {preview && (
        <section className="glass-panel mb-6 p-5">
          <h2 className="section-title">Preview · {preview.filename}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {preview.parsed.days.length} daily rows · {preview.parsed.intervals.length} intervals ·{" "}
            {osatDays} CEMS/OSAT · {sosDays} SOS · {preview.parsed.monthly.length} monthly ·{" "}
            {preview.parsed.goals.length} goal years
            {preview.parsed.kinds.length ? ` · ${preview.parsed.kinds.join(", ")}` : ""}
            {preview.parsed.location ? ` · ${preview.parsed.location}` : ""}
          </p>
          {preview.parsed.warnings.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {preview.parsed.warnings.map((warning) => (
                <li key={warning.message}>{warning.message}</li>
              ))}
            </ul>
          )}
          {preview.parsed.kinds.includes("cems") && preview.parsed.days.some((d) => d.osat != null) && (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-slate-800">
              <p className="font-semibold text-cfa">CEMS PDF scores</p>
              <ul className="mt-2 space-y-1">
                {preview.parsed.days
                  .filter((d) => d.origin === "cems" || d.osat != null)
                  .slice(0, 4)
                  .map((row) => (
                    <li key={`cems-${row.date}`}>
                      {row.date}: OSAT {formatScore(row.osat)}
                      {OSAT_ATTRIBUTES.filter((attr) => attr.key !== "osat" && row[attr.key] != null)
                        .slice(0, 4)
                        .map((attr) => ` · ${attr.label} ${formatScore(row[attr.key] as number)}`)
                        .join("")}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {preview.parsed.intervals.length > 0 && preview.parsed.days.length > 0 && (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-slate-800">
              <p className="font-semibold text-cfa">15-minute rows added up to the day</p>
              <ul className="mt-2 space-y-1">
                {preview.parsed.days
                  .filter((d) => d.kind === "day")
                  .slice(0, 6)
                  .map((row) => (
                    <li key={`sum-${row.date}`}>
                      {row.dayOfWeek ? `${row.dayOfWeek} · ` : ""}
                      {row.date}: {row.salesActual?.toLocaleString() ?? "—"} sales ·{" "}
                      {row.transTy?.toLocaleString() ?? "—"} trans
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {preview.parsed.days.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[520px] w-full text-left text-sm">
                <thead className="text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th>Sales</th>
                    <th>OSAT</th>
                    <th>SOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.parsed.days
                    .filter((d) => d.kind === "day")
                    .slice(0, 8)
                    .map((row) => (
                      <tr key={`${row.date}-${row.kind}`}>
                        <td className="py-2">{row.date}</td>
                        <td>{row.salesActual?.toLocaleString() ?? "—"}</td>
                        <td>{formatScore(row.osat)}</td>
                        <td>{formatSos(row.dtSosTotalSec)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.parsed.intervals.length > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              First interval {preview.parsed.intervals[0].label} on {preview.parsed.intervals[0].date} · last{" "}
              {preview.parsed.intervals.at(-1)?.label}
            </p>
          )}
          <button
            type="button"
            className="btn-primary mt-4 bg-cfa hover:bg-cfa-dark"
            onClick={() => void apply()}
            disabled={busy || saving}
          >
            Apply to scorecard
          </button>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TemplateCard
          title="Daily Data CSV"
          icon={FileSpreadsheet}
          href={asDownload(DAILY_CSV_TEMPLATE)}
          filename="cfa-hueytown-daily.csv"
          copy="Date, sales, labor, OSAT, and SOS columns. Headers can be workbook names or short aliases."
        />
        <TemplateCard
          title="15-Minute CSV"
          icon={FileSpreadsheet}
          href={asDownload(INTERVAL_CSV_TEMPLATE)}
          filename="cfa-hueytown-15min.csv"
          copy="Business Date plus Time Increment / Net Sales / Guest Count, or Time / Sales / Trans / SOS / Cars. Rows add up to the day's sales."
        />
        <TemplateCard
          title="CEMS CSV"
          icon={FileText}
          href={asDownload(CEMS_CSV_TEMPLATE)}
          filename="cfa-hueytown-cems.csv"
          copy="The store CEMS/CEM report is a PDF, not a spreadsheet. Upload that PDF. This CSV is only a fallback."
        />
        <TemplateCard
          title="Monthly P&L CSV"
          icon={FileText}
          href={asDownload(MONTHLY_CSV_TEMPLATE)}
          filename="cfa-hueytown-monthly.csv"
          copy="Year, month, food cost %, net profit %. Enter after the P&L closes."
        />
        <TemplateCard
          title="Goals CSV"
          icon={FileText}
          href={asDownload(GOALS_CSV_TEMPLATE)}
          filename="cfa-hueytown-goals.csv"
          copy="Annual targets. OSAT can be 85 or 0.85; 8500% from Excel is corrected automatically."
        />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <p>
          Last import:{" "}
          {state.lastImport
            ? `${state.lastImport.filename} · ${state.lastImport.rows} rows`
            : "Hueytown seed from the workbook"}
        </p>
        <button type="button" className="btn-secondary" onClick={() => void resetToSeed()}>
          Restore Hueytown sample
        </button>
      </div>
    </>
  );
}

function asDownload(text: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`;
}

function TemplateCard({
  title,
  copy,
  href,
  filename,
  icon: Icon,
}: {
  title: string;
  copy: string;
  href: string;
  filename: string;
  icon: typeof FileSpreadsheet;
}) {
  return (
    <a href={href} download={filename} className="glass-panel p-5 hover:shadow-card-hover">
      <Icon className="h-5 w-5 text-cfa" />
      <p className="mt-3 font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{copy}</p>
      <p className="mt-3 text-sm font-semibold text-cfa">Download template</p>
    </a>
  );
}
