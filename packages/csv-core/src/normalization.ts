/**
 * Normalizes CRLF and CR line endings into LF standard line endings.
 */
export function normalizeLineEndings(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Splits raw CSV text into individual lines by LF.
 * Trims a single trailing empty line if present.
 */
export function splitCsvLines(raw: string): string[] {
  const normalized = normalizeLineEndings(raw);
  if (!normalized) {
    return [];
  }
  const lines = normalized.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}
