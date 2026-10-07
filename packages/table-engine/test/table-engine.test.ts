import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import {
  createDefaultPresentation,
  createDefaultTableConfig,
  formatCellValue,
  getColumnDisplayLabel,
  getColumnProfile,
  getDefaultAlignmentForType,
  getEffectiveColumnType,
  resetColumnPresentation,
  setColumnAlignment,
  setColumnTypeOverride,
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

  describe("Column Inspection and Type Controls", () => {
    const typedDoc: CsvDocument = {
      headers: ["id", "active", "joined", "code", "amount", "amount"],
      rows: [
        {
          index: 0,
          lineNumber: 2,
          fields: ["101", "true", "2026-01-15", "00123", "500", "1000"],
        },
        {
          index: 1,
          lineNumber: 3,
          fields: ["102", "false", "2026-02-20", "00456", "750", "2000"],
        },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 6,
    };

    it("stores inferred types in default presentation for each semantic type", () => {
      const presentation = createDefaultPresentation(typedDoc);

      // number column
      expect(presentation.columns[0]?.inferredType).toBe("number");
      expect(presentation.columns[0]?.align).toBe("right");

      // boolean column
      expect(presentation.columns[1]?.inferredType).toBe("boolean");
      expect(presentation.columns[1]?.align).toBe("left");

      // date column
      expect(presentation.columns[2]?.inferredType).toBe("date");
      expect(presentation.columns[2]?.align).toBe("left");

      // code with leading zeros is string
      expect(presentation.columns[3]?.inferredType).toBe("string");
      expect(presentation.columns[3]?.align).toBe("left");

      // initially no overrides
      for (const col of presentation.columns) {
        expect(col.typeOverride).toBeUndefined();
      }
    });

    it("resolves effective column type correctly with and without override", () => {
      expect(
        getEffectiveColumnType({
          inferredType: "number",
          typeOverride: undefined,
        }),
      ).toBe("number");

      expect(
        getEffectiveColumnType({
          inferredType: "string",
          typeOverride: "number",
        }),
      ).toBe("number");

      expect(
        getEffectiveColumnType({
          inferredType: "boolean",
          typeOverride: "string",
        }),
      ).toBe("string");
    });

    it("resolves default alignment for column types", () => {
      expect(getDefaultAlignmentForType("number")).toBe("right");
      expect(getDefaultAlignmentForType("string")).toBe("left");
      expect(getDefaultAlignmentForType("boolean")).toBe("left");
      expect(getDefaultAlignmentForType("date")).toBe("left");
    });

    it("sets column type override immutably", () => {
      const presentation = createDefaultPresentation(typedDoc);
      const updated = setColumnTypeOverride(presentation, "col_3", "number");

      // previous presentation is not mutated
      expect(presentation.columns[3]?.typeOverride).toBeUndefined();

      // updated presentation reflects override
      expect(updated.columns[3]?.typeOverride).toBe("number");
      expect(getEffectiveColumnType(updated.columns[3]!)).toBe("number");

      // clearing override with undefined
      const cleared = setColumnTypeOverride(updated, "col_3", undefined);
      expect(cleared.columns[3]?.typeOverride).toBeUndefined();
      expect(getEffectiveColumnType(cleared.columns[3]!)).toBe("string");
    });

    it("sets column alignment immutably", () => {
      const presentation = createDefaultPresentation(typedDoc);
      const updated = setColumnAlignment(presentation, "col_0", "center");

      // original is not mutated
      expect(presentation.columns[0]?.align).toBe("right");

      // updated reflects new alignment
      expect(updated.columns[0]?.align).toBe("center");
      // type inference remains untouched
      expect(updated.columns[0]?.inferredType).toBe("number");
    });

    it("resets a column presentation to inferred type and default alignment", () => {
      const presentation = createDefaultPresentation(typedDoc);
      // Change col_0 alignment to left and col_3 type to number
      const modified = setColumnAlignment(
        setColumnTypeOverride(presentation, "col_3", "number"),
        "col_0",
        "left",
      );

      const resetCol0 = resetColumnPresentation(modified, "col_0");
      expect(resetCol0.columns[0]?.align).toBe("right"); // restored to number default
      expect(resetCol0.columns[0]?.typeOverride).toBeUndefined();
      expect(resetCol0.columns[3]?.typeOverride).toBe("number"); // other column untouched

      const resetCol3 = resetColumnPresentation(resetCol0, "col_3");
      expect(resetCol3.columns[3]?.typeOverride).toBeUndefined();
      expect(resetCol3.columns[3]?.align).toBe("left"); // restored to string default
    });

    it("keeps duplicate header columns independently configurable", () => {
      const presentation = createDefaultPresentation(typedDoc);
      // col_4 and col_5 both have header "amount"
      expect(presentation.columns[4]?.header).toBe("amount");
      expect(presentation.columns[5]?.header).toBe("amount");

      const modified = setColumnAlignment(presentation, "col_4", "center");
      expect(modified.columns[4]?.align).toBe("center");
      expect(modified.columns[5]?.align).toBe("right"); // col_5 unchanged

      const typeModified = setColumnTypeOverride(modified, "col_5", "string");
      expect(typeModified.columns[4]?.typeOverride).toBeUndefined();
      expect(typeModified.columns[5]?.typeOverride).toBe("string");
    });

    it("preserves raw CSV values and immutability when presentation types are overridden", () => {
      const presentation = createDefaultPresentation(typedDoc);
      const modified = setColumnTypeOverride(presentation, "col_3", "number");

      // Effective type is number
      expect(getEffectiveColumnType(modified.columns[3]!)).toBe("number");

      // Underlying CsvDocument and cell fields are NOT mutated: 00123 remains "00123"
      expect(typedDoc.rows[0]?.fields[3]).toBe("00123");
      expect(typedDoc.rows[1]?.fields[3]).toBe("00456");
    });

    it("computes column profile counts accurately without mutating document", () => {
      const docWithEmptyCells: CsvDocument = {
        headers: ["status"],
        rows: [
          { index: 0, lineNumber: 2, fields: ["active"] },
          { index: 1, lineNumber: 3, fields: [""] },
          { index: 2, lineNumber: 4, fields: ["   "] },
          { index: 3, lineNumber: 5, fields: ["pending"] },
        ],
        delimiter: ",",
        rowCount: 4,
        columnCount: 1,
      };

      const profile = getColumnProfile(docWithEmptyCells, 0);
      expect(profile.totalRows).toBe(4);
      expect(profile.nonEmptyCount).toBe(2);
      expect(profile.emptyCount).toBe(2);

      // Verify document rows were not mutated
      expect(docWithEmptyCells.rows[1]?.fields[0]).toBe("");
      expect(docWithEmptyCells.rows[2]?.fields[0]).toBe("   ");
    });
  });
});
