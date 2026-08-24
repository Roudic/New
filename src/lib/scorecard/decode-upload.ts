import * as XLSX from "xlsx";
import { isZipBuffer } from "./decode-text";

export { decodeTextBuffer, isPdfBuffer, isZipBuffer } from "./decode-text";

export function workbookBufferToCsv(buffer: ArrayBuffer | Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const name = wb.SheetNames[0];
  if (!name) return "";
  return XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false });
}

export function looksLikeSpreadsheetName(filename: string, mime = ""): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsm") ||
    mime.includes("spreadsheet") ||
    mime.includes("excel")
  );
}

export function shouldSendToServer(filename: string, mime: string, bytes: Uint8Array): boolean {
  return (
    isZipBuffer(bytes) ||
    looksLikeSpreadsheetName(filename, mime) ||
    filename.toLowerCase().endsWith(".pdf") ||
    mime === "application/pdf" ||
    (bytes[0] === 0x25 && bytes[1] === 0x50)
  );
}
