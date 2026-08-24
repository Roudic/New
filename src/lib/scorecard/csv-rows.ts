export function detectDelimiter(text: string): string {
  const sample = text.split(/\n/).slice(0, 12).join("\n");
  const commas = (sample.match(/,/g) ?? []).length;
  const tabs = (sample.match(/\t/g) ?? []).length;
  const semis = (sample.match(/;/g) ?? []).length;
  if (tabs > commas && tabs >= semis) return "\t";
  if (semis > commas && semis >= tabs) return ";";
  return ",";
}

export function parseCsvRows(text: string, delimiter?: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const sep = delimiter ?? detectDelimiter(text);

  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === sep) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch !== "\r") cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[$%()]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
