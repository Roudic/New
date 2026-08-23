"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import {
  DAILY_CSV_TEMPLATE,
  GOALS_CSV_TEMPLATE,
  MONTHLY_CSV_TEMPLATE,
  parseCsvText,
} from "@/lib/scorecard/parse-csv";
import type { ParseResult } from "@/lib/scorecard/types";

export default function UploadScorecardPage() {
  const { applyParse, resetToSeed, state, saving } = useScorecard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [preview, setPreview] = useState<{ parsed: ParseResult; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(null);
    setPreview(null);
    try {
      if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
        const parsed = parseCsvText(await file.text());
        if (!parsed.days.length && !parsed.monthly.length && !parsed.goals.length) {
          throw new Error(parsed.warnings[0]?.message ?? "No scorecard rows in that CSV.");
        }
        setPreview({ parsed, filename: file.name });
        return;
      }
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/scorecard/parse", { method: "POST", body });
      const json = (await res.json()) as { parsed?: ParseResult; error?: string; filename?: string };
      if (!res.ok || !json.parsed) {
        throw new Error(json.error ?? "Could not read that file.");
      }
      setPreview({ parsed: json.parsed, filename: json.filename ?? file.name });
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
      setDone(
        `Imported ${preview.parsed.days.length} daily rows, ${preview.parsed.monthly.length} monthly overlays, ${preview.parsed.goals.length} goal years from ${preview.filename}.`
      );
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save imported data.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Upload CSV or PDF"
        description="Drop the Chick-fil-A Hueytown workbook PDF or a Daily Data CSV. The parser reads sales, labor, OSAT, drive-thru times, monthly P&L, and the Goals tab — including Excel percent bugs like 8500% → 85 OSAT."
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
        <p className="mt-3 font-semibold text-slate-900">Drop a .csv or .pdf here</p>
        <p className="mt-1 text-sm text-slate-500">
          Workbook PDFs and Daily Data / monthly / goals CSV exports are supported.
        </p>
        <button
          type="button"
          className="btn-primary mt-4 bg-cfa hover:bg-cfa-dark"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Reading file…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.pdf,text/csv,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void parseFile(file);
            e.target.value = "";
          }}
        />
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
            {preview.parsed.days.length} daily rows · {preview.parsed.monthly.length} monthly
            overlays · {preview.parsed.goals.length} goal years
            {preview.parsed.location ? ` · ${preview.parsed.location}` : ""}
          </p>
          {preview.parsed.warnings.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {preview.parsed.warnings.map((warning) => (
                <li key={warning.message}>{warning.message}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[520px] w-full text-left text-sm">
              <thead className="text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Sales</th>
                  <th>Labor</th>
                  <th>OSAT</th>
                  <th>SOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.parsed.days
                  .filter((d) => d.kind === "day" && (d.salesActual || d.laborActual))
                  .slice(0, 8)
                  .map((row) => (
                    <tr key={`${row.date}-${row.kind}`}>
                      <td className="py-2">{row.date}</td>
                      <td>{row.salesActual?.toLocaleString() ?? "—"}</td>
                      <td>{row.laborActual?.toLocaleString() ?? "—"}</td>
                      <td>{row.osat ?? "—"}</td>
                      <td>{row.dtSosTotalSec ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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

      <section className="grid gap-4 md:grid-cols-3">
        <TemplateCard
          title="Daily Data CSV"
          icon={FileSpreadsheet}
          href={asDownload(DAILY_CSV_TEMPLATE)}
          filename="cfa-hueytown-daily.csv"
          copy="Date, sales, labor, OSAT, and SOS columns. Headers can be workbook names or short aliases."
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
