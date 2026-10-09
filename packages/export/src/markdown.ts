import type { CsvDocument } from "@csvora/csv-core";
import type { ColumnAlign, PresentationConfig } from "@csvora/schemas";
import {
  formatPresentationValue,
  getColumnDisplayLabel,
  getVisibleColumns,
} from "@csvora/table-engine";
import { getExportFilename } from "./filename";
import type { ExportResult, MarkdownExportOptions } from "./types";

/**
 * Escapes Markdown table-breaking characters and Markdown syntax formatting in cell values.
 *
 * Rules:
 * - Escapes backslashes (\ -> \\).
 * - Sanitizes HTML brackets (< -> &lt;, > -> &gt;) to prevent executable HTML.
 * - Converts newlines (\r\n, \r, \n) to '<br />' to preserve multiline cell content.
 * - Escapes table delimiter pipes (| -> \|).
 * - Escapes Markdown markup characters (*, _, [, ]) so user data does not accidentally
 *   trigger italics, bold, or links.
 */
export function escapeMarkdownCell(value: string): string {
  if (!value) {
    return "";
  }

  return (
    value
      // 1. Escape backslashes first
      .replaceAll("\\", "\\\\")
      // 2. Prevent unintended raw HTML execution
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      // 3. Preserve multiline content safely within Markdown table rows
      .replace(/\r\n|\r|\n/g, "<br />")
      // 4. Escape table column divider pipe
      .replaceAll("|", "\\|")
      // 5. Escape Markdown emphasis and link characters
      .replaceAll("*", "\\*")
      .replaceAll("_", "\\_")
      .replaceAll("[", "\\[")
      .replaceAll("]", "\\]")
  );
}

/**
 * Formats column alignment indicator according to GitHub-flavored Markdown table syntax:
 * - left: ':---'
 * - center: ':---:'
 * - right: '---:'
 */
function getMarkdownAlignmentIndicator(align: ColumnAlign): string {
  switch (align) {
    case "right":
      return "---:";
    case "center":
      return ":---:";
    case "left":
    default:
      return ":---";
  }
}

/**
 * Exports a CsvDocument to GitHub-flavored Markdown table format based on active PresentationConfig.
 *
 * Rules:
 * - Respects active presentation column order.
 * - Respects column visibility: exports visible columns only.
 * - Uses formatted display values from @csvora/table-engine.
 * - Applies conservative escaping to pipes, newlines, and markdown syntax.
 * - Preserves column text alignment (:---, :---:, ---:).
 * - Defensive on empty or zero visible column datasets (returns empty string without crashing).
 * - Never mutates source CsvDocument or PresentationConfig.
 */
export function exportMarkdown(
  document: CsvDocument,
  presentation: PresentationConfig,
  options?: MarkdownExportOptions,
): ExportResult {
  const lineTerminator = options?.lineTerminator ?? "\n";
  const visibleColumns = getVisibleColumns(presentation);

  if (
    visibleColumns.length === 0 ||
    (document.headers.length === 0 && document.rows.length === 0)
  ) {
    return {
      content: "",
      mimeType: "text/markdown;charset=utf-8",
      fileExtension: "md",
      suggestedFilename: getExportFilename(options?.filename, "markdown"),
    };
  }

  const lines: string[] = [];

  // 1. Header row
  const headers = visibleColumns.map((col) => escapeMarkdownCell(getColumnDisplayLabel(col)));
  lines.push(`| ${headers.join(" | ")} |`);

  // 2. Alignment row
  const alignments = visibleColumns.map((col) => getMarkdownAlignmentIndicator(col.align));
  lines.push(`| ${alignments.join(" | ")} |`);

  // 3. Data rows
  for (const row of document.rows) {
    const cells = visibleColumns.map((col) => {
      const rawValue = row.fields[col.sourceIndex];
      const formatted = formatPresentationValue(rawValue, col);
      return escapeMarkdownCell(formatted);
    });
    lines.push(`| ${cells.join(" | ")} |`);
  }

  const content = lines.length > 0 ? `${lines.join(lineTerminator)}${lineTerminator}` : "";

  return {
    content,
    mimeType: "text/markdown;charset=utf-8",
    fileExtension: "md",
    suggestedFilename: getExportFilename(options?.filename, "markdown"),
  };
}
