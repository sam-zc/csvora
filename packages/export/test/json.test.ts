import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import { exportJson, type LosslessJsonExport } from "../src";

describe("@csvora/export exportJson", () => {
  const documentWithDuplicates: CsvDocument = {
    headers: ["amount", "", "amount"],
    rows: [
      {
        index: 0,
        lineNumber: 2,
        fields: ["100", "notes", "200"],
      },
      {
        index: 1,
        lineNumber: 3,
        fields: ["300", "", "400", "EXTRA_UNEVEN_FIELD"], // uneven row with extra field
      },
    ],
    delimiter: ",",
    rowCount: 2,
    columnCount: 3,
  };

  it("exports lossless JSON preserving columns with duplicate and empty headers", () => {
    const result = exportJson(documentWithDuplicates, { filename: "transactions.csv" });

    expect(result.mimeType).toBe("application/json;charset=utf-8");
    expect(result.fileExtension).toBe("json");
    expect(result.suggestedFilename).toBe("transactions.json");

    const parsed: LosslessJsonExport = JSON.parse(result.content);

    // Columns array preserves distinct IDs and exact source headers
    expect(parsed.columns).toHaveLength(3);
    expect(parsed.columns[0]).toEqual({ id: "col_0", header: "amount", sourceIndex: 0 });
    expect(parsed.columns[1]).toEqual({ id: "col_1", header: "", sourceIndex: 1 });
    expect(parsed.columns[2]).toEqual({ id: "col_2", header: "amount", sourceIndex: 2 });

    // Rows array preserves row field values
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual(["100", "notes", "200"]);

    // Uneven row preserves extra fields without dropping them!
    expect(parsed.rows[1]).toEqual(["300", "", "400", "EXTRA_UNEVEN_FIELD"]);
  });

  it("supports compact JSON when pretty: false", () => {
    const result = exportJson(documentWithDuplicates, { pretty: false });
    expect(result.content).not.toContain("\n  ");
    const parsed = JSON.parse(result.content);
    expect(parsed.columns).toHaveLength(3);
  });

  it("handles Unicode content cleanly without mangling characters", () => {
    const unicodeDoc: CsvDocument = {
      headers: ["script", "text"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Tamil", "தமிழ்"] },
        { index: 1, lineNumber: 3, fields: ["Emoji", "🚀✨"] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 2,
    };

    const result = exportJson(unicodeDoc);
    const parsed: LosslessJsonExport = JSON.parse(result.content);

    expect(parsed.rows[0]).toEqual(["Tamil", "தமிழ்"]);
    expect(parsed.rows[1]).toEqual(["Emoji", "🚀✨"]);
  });

  it("handles empty document safely", () => {
    const emptyDoc: CsvDocument = {
      headers: [],
      rows: [],
      delimiter: ",",
      rowCount: 0,
      columnCount: 0,
    };

    const result = exportJson(emptyDoc);
    const parsed: LosslessJsonExport = JSON.parse(result.content);
    expect(parsed.columns).toEqual([]);
    expect(parsed.rows).toEqual([]);
  });

  it("never mutates the input CsvDocument", () => {
    const originalField = documentWithDuplicates.rows[0]?.fields[0];
    exportJson(documentWithDuplicates);
    expect(documentWithDuplicates.rows[0]?.fields[0]).toBe(originalField);
  });
});
