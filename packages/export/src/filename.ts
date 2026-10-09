import type { ExportFormat } from "./types";

/**
 * Sanitizes a filename string by removing or replacing filesystem-hostile characters
 * and trimming leading/trailing dots, hyphens, and whitespace.
 *
 * Rules:
 * - Replaces [/\?%*:|"<>], control characters, and backslashes with hyphens.
 * - Collapses repeated hyphens into a single hyphen.
 * - Trims leading and trailing hyphens, dots, and whitespace.
 * - Falls back to 'export' if the result is empty or consists entirely of invalid characters.
 */
export function sanitizeFilename(name: string): string {
  if (!name || name.trim().length === 0) {
    return "export";
  }

  // Strip control chars and illegal filesystem chars: / \ ? % * : | " < >
  const sanitized = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F/\\?%*:|"<>]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "");

  return sanitized.length > 0 ? sanitized : "export";
}

/**
 * Extracts the base filename without a trailing .csv or other extension.
 */
function extractBaseName(sourceFilename: string | undefined): string {
  if (!sourceFilename || sourceFilename.trim().length === 0) {
    return "export";
  }

  const trimmed = sourceFilename.trim();
  // Strip .csv or other extension if present
  const withoutExt = trimmed.replace(/\.[a-zA-Z0-9]+$/, "");
  return sanitizeFilename(withoutExt);
}

/**
 * Deterministically constructs an export filename based on the source filename and target format.
 *
 * Examples:
 * - ("sales.csv", "csv") -> "sales.csv"
 * - ("sales.csv", "formatted-csv") -> "sales-formatted.csv"
 * - ("sales.csv", "markdown") -> "sales.md"
 * - ("sales.csv", "json") -> "sales.json"
 * - (undefined, "formatted-csv") -> "export-formatted.csv"
 */
export function getExportFilename(
  sourceFilename: string | undefined,
  format: ExportFormat,
): string {
  const base = extractBaseName(sourceFilename);

  switch (format) {
    case "csv":
      return `${base}.csv`;
    case "formatted-csv":
      return `${base}-formatted.csv`;
    case "markdown":
      return `${base}.md`;
    case "json":
      return `${base}.json`;
    default: {
      const _exhaustive: never = format;
      return `${base}.${String(_exhaustive)}`;
    }
  }
}
