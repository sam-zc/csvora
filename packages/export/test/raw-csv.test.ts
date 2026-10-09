import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import { exportRawCsv } from "../src";

describe("@csvora/export exportRawCsv", () => {
  const sampleDocument: CsvDocument = {
    headers: ["id", "name", "amount", "notes"],
    rows: [
      {
        index: 0,
        lineNumber: 2,
        fields: ["1", "Alpha", "1250000", 'Clean "quoted" note'],
      },
      {
        index: 1,
        lineNumber: 3,
        fields: ["2", "Beta", "-45.50", "Line 1\nLine 2"],
      },
      {
        index: 2,
        lineNumber: 4,
        fields: ["3", "Gamma", "=SUM(A1:A2)", ""],
      },
    ],
    delimiter: ",",
    rowCount: 3,
    columnCount: 4,
  };

  it("exports raw CSV with RFC 4180 format, correct MIME type and fileExtension", () => {
    const result = exportRawCsv(sampleDocument, { filename: "sales.csv" });

    expect(result.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.fileExtension).toBe("csv");
    expect(result.suggestedFilename).toBe("sales.csv");

    // CRLF line endings
    expect(result.content).toContain("\r\n");
    expect(result.content.startsWith("id,name,amount,notes\r\n")).toBe(true);

    // Multiline & quotes preserved
    expect(result.content).toContain('"Clean ""quoted"" note"');
    expect(result.content).toContain('"Line 1\nLine 2"');
  });

  it("escapes formula injection risks by default by prefixing with '", () => {
    const result = exportRawCsv(sampleDocument);

    // =SUM(A1:A2) safely prefixed with '
    expect(result.content).toContain("'=SUM(A1:A2)");
    // -45.50 safely prefixed with '
    expect(result.content).toContain("'-45.50");
  });

  it("supports formulaPolicy: 'preserve' to output raw formula strings without prefix", () => {
    const result = exportRawCsv(sampleDocument, { formulaPolicy: "preserve" });

    expect(result.content).toContain("=SUM(A1:A2)");
    expect(result.content).not.toContain("'=SUM(A1:A2)");
    expect(result.content).toContain("-45.50");
    expect(result.content).not.toContain("'-45.50");
  });

  it("preserves malformed extra fields in rows without truncation", () => {
    const malformedDoc: CsvDocument = {
      headers: ["h1", "h2"],
      rows: [{ index: 0, lineNumber: 2, fields: ["val1", "val2", "extra1", "extra2"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    const result = exportRawCsv(malformedDoc);
    expect(result.content).toBe("h1,h2\r\nval1,val2,extra1,extra2\r\n");
  });

  it("preserves empty headers and duplicate headers losslessly", () => {
    const dupDoc: CsvDocument = {
      headers: ["code", "", "code"],
      rows: [{ index: 0, lineNumber: 2, fields: ["A", "mid", "B"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 3,
    };

    const result = exportRawCsv(dupDoc);
    expect(result.content).toBe("code,,code\r\nA,mid,B\r\n");
  });

  it("handles custom delimiter and UTF-8 BOM", () => {
    const doc: CsvDocument = {
      headers: ["col1", "col2"],
      rows: [{ index: 0, lineNumber: 2, fields: ["a", "b"] }],
      delimiter: ";",
      rowCount: 1,
      columnCount: 2,
    };

    const result = exportRawCsv(doc, { delimiter: ";", includeBom: true });
    expect(result.content.startsWith("\uFEFF")).toBe(true);
    expect(result.content).toBe("\uFEFFcol1;col2\r\na;b\r\n");
  });

  it("handles Unicode characters without corruption", () => {
    const unicodeDoc: CsvDocument = {
      headers: ["lang", "greeting"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Tamil", "வணக்கம்"] },
        { index: 1, lineNumber: 3, fields: ["CJK", "東京"] },
        { index: 2, lineNumber: 4, fields: ["Emoji", "🎉📊"] },
      ],
      delimiter: ",",
      rowCount: 3,
      columnCount: 2,
    };

    const result = exportRawCsv(unicodeDoc);
    expect(result.content).toContain("Tamil,வணக்கம்");
    expect(result.content).toContain("CJK,東京");
    expect(result.content).toContain("Emoji,🎉📊");
  });

  it("never mutates the input CsvDocument", () => {
    const originalField = sampleDocument.rows[2]?.fields[2];
    exportRawCsv(sampleDocument, { formulaPolicy: "escape" });
    expect(sampleDocument.rows[2]?.fields[2]).toBe(originalField);
  });
});
