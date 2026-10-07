import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import {
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  canHideColumn,
  createDefaultPresentation,
  createDefaultTableConfig,
  formatCellValue,
  getColumnDisplayLabel,
  getColumnProfile,
  getDefaultAlignmentForType,
  getEffectiveColumnType,
  getVisibleColumns,
  moveColumn,
  normalizeColumnWidth,
  resetColumnPresentation,
  resetLayout,
  setColumnAlignment,
  setColumnTypeOverride,
  setColumnVisibility,
  setColumnWidth,
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

  describe("Column Visibility Controls & Visible Derivation", () => {
    const sampleDoc: CsvDocument = {
      headers: ["name", "score", "city"],
      rows: [{ index: 0, lineNumber: 2, fields: ["Alice", "95", "NYC"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 3,
    };

    it("derives visible columns in presentation order using getVisibleColumns", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      expect(getVisibleColumns(presentation)).toHaveLength(3);

      const withHidden = setColumnVisibility(presentation, "col_1", false);
      const visible = getVisibleColumns(withHidden);
      expect(visible).toHaveLength(2);
      expect(visible.map((c) => c.id)).toEqual(["col_0", "col_2"]);
    });

    it("toggles column visibility immutably without removing column from presentation", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      const hidden = setColumnVisibility(presentation, "col_0", false);

      expect(presentation.columns[0]?.visible).toBe(true);
      expect(hidden.columns[0]?.visible).toBe(false);
      expect(hidden.columns).toHaveLength(3); // column is still preserved in columns array

      const shown = setColumnVisibility(hidden, "col_0", true);
      expect(shown.columns[0]?.visible).toBe(true);
      expect(shown.columns).toHaveLength(3);
    });

    it("prevents hiding the last visible column", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      // Hide 2 of 3 columns
      const step1 = setColumnVisibility(presentation, "col_0", false);
      const step2 = setColumnVisibility(step1, "col_1", false);

      expect(getVisibleColumns(step2)).toHaveLength(1);
      expect(canHideColumn(step2, "col_2")).toBe(false);

      // Attempting to hide col_2 should be rejected and return presentation unchanged
      const step3 = setColumnVisibility(step2, "col_2", false);
      expect(step3).toBe(step2);
      expect(step3.columns[2]?.visible).toBe(true);
      expect(getVisibleColumns(step3)).toHaveLength(1);
    });

    it("canHideColumn reports correct permission for visible vs already hidden columns", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      expect(canHideColumn(presentation, "col_0")).toBe(true);

      const oneVisible = setColumnVisibility(
        setColumnVisibility(presentation, "col_0", false),
        "col_1",
        false,
      );
      // col_2 is the sole visible column
      expect(canHideColumn(oneVisible, "col_2")).toBe(false);
      // already hidden column can technically be toggled or checked
      expect(canHideColumn(oneVisible, "col_0")).toBe(true);
    });

    it("preserves other column presentation overrides when hiding and showing", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      const configured = setColumnWidth(
        setColumnAlignment(
          setColumnTypeOverride(presentation, "col_1", "string"),
          "col_1",
          "center",
        ),
        "col_1",
        200,
      );

      const hidden = setColumnVisibility(configured, "col_1", false);
      expect(hidden.columns[1]?.visible).toBe(false);
      expect(hidden.columns[1]?.typeOverride).toBe("string");
      expect(hidden.columns[1]?.align).toBe("center");
      expect(hidden.columns[1]?.width).toBe(200);

      const restored = setColumnVisibility(hidden, "col_1", true);
      expect(restored.columns[1]?.visible).toBe(true);
      expect(restored.columns[1]?.typeOverride).toBe("string");
      expect(restored.columns[1]?.align).toBe("center");
      expect(restored.columns[1]?.width).toBe(200);
    });
  });

  describe("Column Reordering & Presentation Order", () => {
    const multiColDoc: CsvDocument = {
      headers: ["name", "score", "city"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Alice", "95", "NYC"] },
        { index: 1, lineNumber: 3, fields: ["Bob", "82", "London"] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 3,
    };

    it("moves column right/down and left/up while keeping sourceIndex unchanged", () => {
      const presentation = createDefaultPresentation(multiColDoc);
      expect(presentation.columns.map((c) => c.id)).toEqual(["col_0", "col_1", "col_2"]);

      // Move col_0 right
      const movedRight = moveColumn(presentation, "col_0", "right");
      expect(movedRight.columns.map((c) => c.id)).toEqual(["col_1", "col_0", "col_2"]);
      // sourceIndex must not change
      expect(movedRight.columns[0]?.sourceIndex).toBe(1); // col_1 still points to index 1
      expect(movedRight.columns[1]?.sourceIndex).toBe(0); // col_0 still points to index 0
      expect(movedRight.columns[2]?.sourceIndex).toBe(2);

      // Move col_0 left back to start
      const movedLeft = moveColumn(movedRight, "col_0", "left");
      expect(movedLeft.columns.map((c) => c.id)).toEqual(["col_0", "col_1", "col_2"]);
    });

    it("treats up/down aliases as left/right", () => {
      const presentation = createDefaultPresentation(multiColDoc);
      const movedDown = moveColumn(presentation, "col_0", "down");
      expect(movedDown.columns.map((c) => c.id)).toEqual(["col_1", "col_0", "col_2"]);

      const movedUp = moveColumn(movedDown, "col_0", "up");
      expect(movedUp.columns.map((c) => c.id)).toEqual(["col_0", "col_1", "col_2"]);
    });

    it("no-ops when moving first column left or last column right", () => {
      const presentation = createDefaultPresentation(multiColDoc);

      const moveFirstLeft = moveColumn(presentation, "col_0", "left");
      expect(moveFirstLeft).toBe(presentation);

      const moveLastRight = moveColumn(presentation, "col_2", "right");
      expect(moveLastRight).toBe(presentation);
    });

    it("safely handles unknown column ID without throwing", () => {
      const presentation = createDefaultPresentation(multiColDoc);
      const result = moveColumn(presentation, "non_existent_id", "left");
      expect(result).toBe(presentation);
    });

    it("reorders duplicate headers independently by column id", () => {
      const dupDoc: CsvDocument = {
        headers: ["amount", "amount", "total"],
        rows: [{ index: 0, lineNumber: 2, fields: ["10", "20", "30"] }],
        delimiter: ",",
        rowCount: 1,
        columnCount: 3,
      };

      const presentation = createDefaultPresentation(dupDoc);
      expect(presentation.columns[0]?.id).toBe("col_0");
      expect(presentation.columns[1]?.id).toBe("col_1");

      // Move col_1 right past total
      const moved = moveColumn(presentation, "col_1", "right");
      expect(moved.columns.map((c) => c.id)).toEqual(["col_0", "col_2", "col_1"]);
      // First amount stays at index 0, second amount is now at index 2
      expect(moved.columns[0]?.id).toBe("col_0");
      expect(moved.columns[0]?.sourceIndex).toBe(0);
      expect(moved.columns[2]?.id).toBe("col_1");
      expect(moved.columns[2]?.sourceIndex).toBe(1);
    });

    it("preserves deterministic order for hidden columns when reordering", () => {
      const presentation = createDefaultPresentation(multiColDoc);
      const withHidden = setColumnVisibility(presentation, "col_1", false);

      // Move col_2 (last) left past hidden col_1
      const moved = moveColumn(withHidden, "col_2", "left");
      expect(moved.columns.map((c) => c.id)).toEqual(["col_0", "col_2", "col_1"]);
      expect(moved.columns[2]?.visible).toBe(false);

      // getVisibleColumns reflects the new order
      const visible = getVisibleColumns(moved);
      expect(visible.map((c) => c.id)).toEqual(["col_0", "col_2"]);
    });
  });

  describe("Column Width Metadata & Bounds", () => {
    const sampleDoc: CsvDocument = {
      headers: ["title", "description"],
      rows: [{ index: 0, lineNumber: 2, fields: ["Book", "A great read"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    it("normalizes column widths within bounds [MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH]", () => {
      expect(normalizeColumnWidth(150)).toBe(150);
      expect(normalizeColumnWidth(MIN_COLUMN_WIDTH)).toBe(MIN_COLUMN_WIDTH);
      expect(normalizeColumnWidth(MAX_COLUMN_WIDTH)).toBe(MAX_COLUMN_WIDTH);

      // Below min clamped to min
      expect(normalizeColumnWidth(20)).toBe(MIN_COLUMN_WIDTH);
      expect(normalizeColumnWidth(-50)).toBe(MIN_COLUMN_WIDTH);

      // Above max clamped to max
      expect(normalizeColumnWidth(1000)).toBe(MAX_COLUMN_WIDTH);

      // Rounds non-integers
      expect(normalizeColumnWidth(120.4)).toBe(120);
      expect(normalizeColumnWidth(120.7)).toBe(121);

      // Non-finite numbers fall back safely to min
      expect(normalizeColumnWidth(Number.NaN)).toBe(MIN_COLUMN_WIDTH);
    });

    it("sets column width immutably and preserves other column properties", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      const configured = setColumnTypeOverride(presentation, "col_0", "string");
      const withWidth = setColumnWidth(configured, "col_0", 250);

      expect(configured.columns[0]?.width).toBeUndefined();
      expect(withWidth.columns[0]?.width).toBe(250);
      expect(withWidth.columns[0]?.typeOverride).toBe("string");
      expect(withWidth.columns[0]?.align).toBe("left");
    });

    it("clears custom width back to auto when undefined is passed", () => {
      const presentation = createDefaultPresentation(sampleDoc);
      const withWidth = setColumnWidth(presentation, "col_0", 250);
      expect(withWidth.columns[0]?.width).toBe(250);

      const cleared = setColumnWidth(withWidth, "col_0", undefined);
      expect(cleared.columns[0]?.width).toBeUndefined();
    });
  });

  describe("Reset Semantics: Column vs Layout", () => {
    const multiDoc: CsvDocument = {
      headers: ["colA", "colB", "colC"],
      rows: [{ index: 0, lineNumber: 2, fields: ["1", "2", "3"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 3,
    };

    it("resetColumnPresentation clears overrides, custom width, and restores visibility without changing order", () => {
      const presentation = createDefaultPresentation(multiDoc);
      // Reorder col_2 to first
      const reordered = moveColumn(moveColumn(presentation, "col_2", "left"), "col_2", "left");
      expect(reordered.columns.map((c) => c.id)).toEqual(["col_2", "col_0", "col_1"]);

      // Apply overrides to col_2: hidden, width 300, alignment center, type string
      const modified = setColumnTypeOverride(
        setColumnAlignment(
          setColumnWidth(setColumnVisibility(reordered, "col_2", false), "col_2", 300),
          "col_2",
          "center",
        ),
        "col_2",
        "string",
      );

      const reset = resetColumnPresentation(modified, "col_2");
      const targetCol = reset.columns[0];
      expect(targetCol?.id).toBe("col_2");
      expect(targetCol?.visible).toBe(true);
      expect(targetCol?.width).toBeUndefined();
      expect(targetCol?.typeOverride).toBeUndefined();
      expect(targetCol?.align).toBe("right"); // restored to number default

      // Order is preserved: col_2 is still first
      expect(reset.columns.map((c) => c.id)).toEqual(["col_2", "col_0", "col_1"]);
    });

    it("resetLayout restores source order, shows all columns, and clears widths while preserving type and alignment overrides", () => {
      const presentation = createDefaultPresentation(multiDoc);
      // Modify order: move col_0 to the end
      const step1 = moveColumn(moveColumn(presentation, "col_0", "right"), "col_0", "right");
      expect(step1.columns.map((c) => c.id)).toEqual(["col_1", "col_2", "col_0"]);

      // Set overrides: hide col_1, custom width on col_2, type override on col_0, custom alignment on col_2
      const configured = setColumnAlignment(
        setColumnTypeOverride(
          setColumnWidth(setColumnVisibility(step1, "col_1", false), "col_2", 400),
          "col_0",
          "string",
        ),
        "col_2",
        "center",
      );

      const layoutReset = resetLayout(configured);

      // Source column order is restored
      expect(layoutReset.columns.map((c) => c.id)).toEqual(["col_0", "col_1", "col_2"]);
      expect(layoutReset.columns.map((c) => c.sourceIndex)).toEqual([0, 1, 2]);

      // All columns are visible
      expect(layoutReset.columns.every((c) => c.visible)).toBe(true);

      // All custom widths cleared
      expect(layoutReset.columns.every((c) => c.width === undefined)).toBe(true);

      // Semantic overrides are PRESERVED
      expect(layoutReset.columns[0]?.typeOverride).toBe("string");
      expect(layoutReset.columns[2]?.align).toBe("center");
    });
  });

  describe("Immutability of CsvDocument", () => {
    it("never mutates CsvDocument headers, rows, or dimensions through presentation changes", () => {
      const doc: CsvDocument = {
        headers: ["a", "b", "c"],
        rows: [{ index: 0, lineNumber: 2, fields: ["x", "y", "z"] }],
        delimiter: ",",
        rowCount: 1,
        columnCount: 3,
      };

      const origHeaders = [...doc.headers];
      const origRows = JSON.parse(JSON.stringify(doc.rows));

      let pres = createDefaultPresentation(doc);
      pres = moveColumn(pres, "col_0", "right");
      pres = setColumnVisibility(pres, "col_1", false);
      pres = setColumnWidth(pres, "col_2", 300);
      pres = resetLayout(pres);

      expect(doc.headers).toEqual(origHeaders);
      expect(doc.rows).toEqual(origRows);
      expect(doc.rowCount).toBe(1);
      expect(doc.columnCount).toBe(3);
    });
  });
});
