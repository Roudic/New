export function isPdfBuffer(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export function isZipBuffer(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function nulRatio(bytes: Uint8Array, offset: number): number {
  const sample = Math.min(bytes.length, 240);
  if (sample < 8) return 0;
  let nuls = 0;
  let checked = 0;
  for (let i = offset; i < sample; i += 2) {
    checked += 1;
    if (bytes[i] === 0) nuls += 1;
  }
  return checked ? nuls / checked : 0;
}

export function decodeTextBuffer(buffer: ArrayBuffer | Buffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  // iPhone/Excel CSV often ships UTF-16 without a BOM (NUL between ASCII letters).
  if (nulRatio(bytes, 1) > 0.55) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (nulRatio(bytes, 0) > 0.55) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const replacements = (utf8.match(/\uFFFD/g) ?? []).length;
  if (replacements > 0 && replacements / Math.max(utf8.length, 1) > 0.02) {
    return new TextDecoder("windows-1252").decode(bytes);
  }
  return utf8;
}
