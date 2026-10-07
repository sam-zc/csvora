import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import {
  createDefaultPresentation,
  createDefaultTableConfig,
  formatCellValue,
  getColumnDisplayLabel,
} from "../src";

describe("@csvora/table-engine", () => {
  it("creates a default table config", () => {
    const config = createDefaultTableConfig({
      id: "tbl-1",
      name: "Users",
      columns: [{ id: "c1", name: "Email" }],
    });

    expect(config.id).toBe("tbl-1");
    expect(config.name).toBe("Users");
    expect(config.columns).toHaveLength(1);
    expect(config.columns[0]?.type).toBe("string");
  });

  it("handles missing columns gracefully", () => {
    const config = createDefaultTableConfig({
      id: "tbl-empty",
      name: "Empty Table",
    });

    expect(config.columns).toHaveLength(0);
  });

  it("formats string values", () => {
    expect(formatCellValue("hello", "string")).toBe("hello");
  });

  it("formats number values", () => {
    expect(formatCellValue(42, "number")).toBe("42");
    expect(formatCellValue(Number.NaN, "number")).toBe("");
  });

  it("formats boolean values", () => {
    expect(formatCellValue(true, "boolean")).toBe("true");
    expect(formatCellValue(false, "boolean")).toBe("false");
  });

  it("formats null and undefined as empty strings", () => {
    expect(formatCellValue(null, "string")).toBe("");
    expect(formatCellValue(undefined, "number")).toBe("");
  });

  it("formats Date objects", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(formatCellValue(date, "date")).toBe("2026-01-01T00:00:00.000Z");
  });

  describe("createDefaultPresentation", () => {
    const sampleDocument: CsvDocument = {
      headers: ["name", "score", "city"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Alice", "95", "NYC"] },
        { index: 1, lineNumber: 3, fields: ["Bob", "82", "London"] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 3,
    };

    it("creates a table presentation config with table rendererId", () => {
      const presentation = createDefaultPresentation(sampleDocument);
      expect(presentation.rendererId).toBe("table");
      expect(presentation.columns).toHaveLength(3);
    });

    it("preserves source header order and assigns stable unique internal IDs", () => {
      const presentation = createDefaultPresentation(sampleDocument);
      expect(presentation.columns[0]?.id).toBe("col_0");
      expect(presentation.columns[0]?.sourceIndex).toBe(0);
      expect(presentation.columns[0]?.header).toBe("name");
      expect(presentation.columns[0]?.visible).toBe(true);

      expect(presentation.columns[1]?.id).toBe("col_1");
      expect(presentation.columns[1]?.sourceIndex).toBe(1);
      expect(presentation.columns[1]?.header).toBe("score");

      expect(presentation.columns[2]?.id).toBe("col_2");
      expect(presentation.columns[2]?.sourceIndex).toBe(2);
      expect(presentation.columns[2]?.header).toBe("city");
    });

    it("infers right alignment for numeric columns and left for text", () => {
      const presentation = createDefaultPresentation(sampleDocument);
      expect(presentation.columns[0]?.align).toBe("left");
      expect(presentation.columns[1]?.align).toBe("right");
      expect(presentation.columns[2]?.align).toBe("left");
    });

    it("assigns unique IDs even when headers are duplicated", () => {
      const docWithDuplicates: CsvDocument = {
        headers: ["amount", "amount"],
        rows: [{ index: 0, lineNumber: 2, fields: ["10", "20"] }],
        delimiter: ",",
        rowCount: 1,
        columnCount: 2,
      };

      const presentation = createDefaultPresentation(docWithDuplicates);
      expect(presentation.columns[0]?.id).toBe("col_0");
      expect(presentation.columns[1]?.id).toBe("col_1");
      expect(presentation.columns[0]?.id).not.toBe(presentation.columns[1]?.id);
      expect(presentation.columns[0]?.header).toBe("amount");
      expect(presentation.columns[1]?.header).toBe("amount");
    });

    it("preserves empty headers without fabricating names in header property", () => {
      const docWithEmptyHeader: CsvDocument = {
        headers: ["id", "", "notes"],
        rows: [{ index: 0, lineNumber: 2, fields: ["1", "val", "n/a"] }],
        delimiter: ",",
        rowCount: 1,
        columnCount: 3,
      };

      const presentation = createDefaultPresentation(docWithEmptyHeader);
      expect(presentation.columns[1]?.id).toBe("col_1");
      expect(presentation.columns[1]?.header).toBe("");
    });

    it("never mutates the input CsvDocument or its rows", () => {
      const originalHeader = [...sampleDocument.headers];
      const originalRows = [...sampleDocument.rows];
      createDefaultPresentation(sampleDocument);

      expect(sampleDocument.headers).toEqual(originalHeader);
      expect(sampleDocument.rows).toEqual(originalRows);
    });

    it("handles an empty document cleanly", () => {
      const emptyDoc: CsvDocument = {
        headers: [],
        rows: [],
        delimiter: ",",
        rowCount: 0,
        columnCount: 0,
      };

      const presentation = createDefaultPresentation(emptyDoc);
      expect(presentation.rendererId).toBe("table");
      expect(presentation.columns).toEqual([]);
    });
  });

  describe("getColumnDisplayLabel", () => {
    it("returns the header when non-empty", () => {
      expect(getColumnDisplayLabel({ header: "Revenue", sourceIndex: 0 })).toBe("Revenue");
      expect(getColumnDisplayLabel({ header: "Col A", sourceIndex: 3 })).toBe("Col A");
    });

    it("returns 1-indexed fallback label when header is empty or whitespace", () => {
      expect(getColumnDisplayLabel({ header: "", sourceIndex: 0 })).toBe("Column 1");
      expect(getColumnDisplayLabel({ header: "", sourceIndex: 2 })).toBe("Column 3");
      expect(getColumnDisplayLabel({ header: "   ", sourceIndex: 4 })).toBe("Column 5");
    });
  });
});
