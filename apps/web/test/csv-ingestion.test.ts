import { describe, expect, it } from "bun:test";
import {
  formatFileSize,
  MAX_FILE_SIZE_BYTES,
  validateCsvFile,
} from "../src/features/csv-ingestion/lib/validate-file";
import { CsvIngestionError, ingestCsvFile } from "../src/features/csv-ingestion/lib/ingest-file";

describe("CSV Ingestion Unit Tests", () => {
  describe("validateCsvFile", () => {
    it("accepts valid .csv file with text/csv mime type", () => {
      const file = new File(["a,b\n1,2"], "sample.csv", { type: "text/csv" });
      expect(validateCsvFile(file)).toBeNull();
    });

    it("accepts valid .tsv file", () => {
      const file = new File(["a\tb\n1\t2"], "data.tsv", {
        type: "text/tab-separated-values",
      });
      expect(validateCsvFile(file)).toBeNull();
    });

    it("accepts .csv file with empty or missing MIME type", () => {
      const file = new File(["a,b\n1,2"], "test.csv", { type: "" });
      expect(validateCsvFile(file)).toBeNull();
    });

    it("accepts .txt tabular file", () => {
      const file = new File(["a,b\n1,2"], "data.txt", { type: "text/plain" });
      expect(validateCsvFile(file)).toBeNull();
    });

    it("rejects empty file (0 bytes)", () => {
      const file = new File([], "empty.csv", { type: "text/csv" });
      const error = validateCsvFile(file);
      expect(error).not.toBeNull();
      expect(error?.code).toBe("empty_file");
    });

    it("rejects oversized files exceeding 25 MB", () => {
      // Mock file with size property > MAX_FILE_SIZE_BYTES
      const largeFile = new File(["content"], "huge.csv", { type: "text/csv" });
      Object.defineProperty(largeFile, "size", { value: MAX_FILE_SIZE_BYTES + 1024 });

      const error = validateCsvFile(largeFile);
      expect(error).not.toBeNull();
      expect(error?.code).toBe("file_too_large");
      expect(error?.message).toContain("25 MB");
    });

    it("rejects unsupported extensions and types", () => {
      const pdfFile = new File(["%PDF-1.4"], "report.pdf", { type: "application/pdf" });
      const error = validateCsvFile(pdfFile);
      expect(error).not.toBeNull();
      expect(error?.code).toBe("unsupported_type");

      const exeFile = new File(["MZ"], "program.exe", { type: "application/x-msdownload" });
      expect(validateCsvFile(exeFile)?.code).toBe("unsupported_type");
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes, kilobytes, and megabytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(2048)).toBe("2.0 KB");
      expect(formatFileSize(15360)).toBe("15 KB");
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });
  });

  describe("ingestCsvFile", () => {
    it("ingests and parses standard CSV successfully", async () => {
      const raw = "name,age,city\nAlice,30,London\nBob,25,Paris";
      const file = new File([raw], "users.csv", { type: "text/csv", lastModified: 1700000000000 });

      const result = await ingestCsvFile(file);

      expect(result.file.name).toBe("users.csv");
      expect(result.file.size).toBe(raw.length);
      expect(result.file.lastModified).toBe(1700000000000);

      expect(result.document.headers).toEqual(["name", "age", "city"]);
      expect(result.document.rowCount).toBe(2);
      expect(result.document.columnCount).toBe(3);
      expect(result.document.rows[0]?.fields).toEqual(["Alice", "30", "London"]);
      expect(result.document.rows[1]?.fields).toEqual(["Bob", "25", "Paris"]);
      expect(result.document.delimiter).toBe(",");
      expect(result.diagnostics).toEqual([]);
    });

    it("ingests TSV file with automatic delimiter detection", async () => {
      const raw = "col1\tcol2\na\tb\nc\td";
      const file = new File([raw], "tabs.tsv", { type: "text/tab-separated-values" });

      const result = await ingestCsvFile(file);

      expect(result.document.delimiter).toBe("\t");
      expect(result.document.headers).toEqual(["col1", "col2"]);
      expect(result.document.rowCount).toBe(2);
      expect(result.document.rows[0]?.fields).toEqual(["a", "b"]);
    });

    it("ingests UTF-8 Unicode characters without corruption", async () => {
      const raw = "language,greeting,emoji\n日本語,こんにちは,🇯🇵\nதமிழ்,வணக்கம்,🚀";
      const file = new File([raw], "multilingual.csv", { type: "text/csv" });

      const result = await ingestCsvFile(file);

      expect(result.document.headers).toEqual(["language", "greeting", "emoji"]);
      expect(result.document.rows[0]?.fields).toEqual(["日本語", "こんにちは", "🇯🇵"]);
      expect(result.document.rows[1]?.fields).toEqual(["தமிழ்", "வணக்கம்", "🚀"]);
    });

    it("preserves potential formula values without mutating them", async () => {
      const raw = 'name,calc,formula\nTest,"=1+1","@SUM(A1:B1)"';
      const file = new File([raw], "formulas.csv", { type: "text/csv" });

      const result = await ingestCsvFile(file);

      expect(result.document.rows[0]?.fields).toEqual(["Test", "=1+1", "@SUM(A1:B1)"]);
    });

    it("records warnings for duplicate headers and field count mismatches", async () => {
      const raw = "id,name,name\n1,A,B,extra\n2,C";
      const file = new File([raw], "warnings.csv", { type: "text/csv" });

      const result = await ingestCsvFile(file);

      expect(result.document.headers).toEqual(["id", "name", "name"]);
      expect(result.diagnostics.length).toBeGreaterThan(0);

      const dupWarning = result.diagnostics.find((d) => d.code === "duplicate_header");
      expect(dupWarning).toBeDefined();

      const tooManyWarning = result.diagnostics.find((d) => d.code === "too_many_fields");
      expect(tooManyWarning).toBeDefined();

      const tooFewWarning = result.diagnostics.find((d) => d.code === "too_few_fields");
      expect(tooFewWarning).toBeDefined();
    });

    it("records diagnostics for unterminated quotes without crashing", async () => {
      const raw = 'id,text\n1,"unterminated field';
      const file = new File([raw], "broken.csv", { type: "text/csv" });

      const result = await ingestCsvFile(file);

      const err = result.diagnostics.find((d) => d.code === "unterminated_quote");
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
      expect(result.document.rows[0]?.fields).toEqual(["1", "unterminated field"]);
    });

    it("throws CsvIngestionError on validation failure", async () => {
      const emptyFile = new File([], "empty.csv", { type: "text/csv" });
      await expect(ingestCsvFile(emptyFile)).rejects.toThrow(CsvIngestionError);
    });
  });
});
