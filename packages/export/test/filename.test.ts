import { describe, expect, it } from "bun:test";
import { getExportFilename, sanitizeFilename } from "../src";

describe("@csvora/export filename utilities", () => {
  describe("sanitizeFilename", () => {
    it("preserves alphanumeric names with clean hyphens and underscores", () => {
      expect(sanitizeFilename("financial_report-2026")).toBe("financial_report-2026");
    });

    it("strips filesystem-hostile characters like slashes, colons, pipes, and quotes", () => {
      expect(sanitizeFilename('report/2026:Q1?"*<>|')).toBe("report-2026-Q1");
    });

    it("trims leading and trailing dots and spaces", () => {
      expect(sanitizeFilename("  ...data...  ")).toBe("data");
    });

    it("falls back to 'export' for empty, whitespace, or invalid names", () => {
      expect(sanitizeFilename("")).toBe("export");
      expect(sanitizeFilename("   ")).toBe("export");
      expect(sanitizeFilename("???///:::***")).toBe("export");
    });
  });

  describe("getExportFilename", () => {
    it("generates raw csv filename preserving base name", () => {
      expect(getExportFilename("sales.csv", "csv")).toBe("sales.csv");
    });

    it("generates formatted csv filename with -formatted suffix", () => {
      expect(getExportFilename("sales.csv", "formatted-csv")).toBe("sales-formatted.csv");
    });

    it("generates markdown filename with .md extension", () => {
      expect(getExportFilename("sales.csv", "markdown")).toBe("sales.md");
    });

    it("generates json filename with .json extension", () => {
      expect(getExportFilename("sales.csv", "json")).toBe("sales.json");
    });

    it("handles source filenames without extensions cleanly", () => {
      expect(getExportFilename("quarterly-report", "formatted-csv")).toBe(
        "quarterly-report-formatted.csv",
      );
      expect(getExportFilename("quarterly-report", "markdown")).toBe("quarterly-report.md");
    });

    it("handles undefined or empty source filename with fallback", () => {
      expect(getExportFilename(undefined, "csv")).toBe("export.csv");
      expect(getExportFilename(undefined, "formatted-csv")).toBe("export-formatted.csv");
      expect(getExportFilename(undefined, "markdown")).toBe("export.md");
      expect(getExportFilename(undefined, "json")).toBe("export.json");
    });
  });
});
