import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import {
  createDefaultPresentation,
  getColumnDisplayLabel,
  getVisibleColumns,
  moveColumn,
  resetColumnPresentation,
  resetLayout,
  setColumnAlignment,
  setColumnTypeOverride,
  setColumnVisibility,
  setColumnWidth,
} from "@csvora/table-engine";
import type { LoadedCsvDocument } from "../src/features/csv-ingestion";

describe("CSV Preview Workspace & Presentation Integration", () => {
  const mockLoadedDocument: LoadedCsvDocument = {
    file: {
      name: "transactions.csv",
      size: 1024,
      type: "text/csv",
      lastModified: 1700000000000,
    },
    document: {
      headers: ["id", "amount", "description", ""],
      rows: [
        { index: 0, lineNumber: 2, fields: ["tx_1", "120.50", "Subscription", "Active"] },
        { index: 1, lineNumber: 3, fields: ["tx_2", "-45.00", "Refund"] }, // 3 fields: missing 1
        {
          index: 2,
          lineNumber: 4,
          fields: ["tx_3", "99.99", "Purchase", "Pending", "EXTRA_FIELD"], // 5 fields: 1 extra
        },
      ],
      delimiter: ",",
      rowCount: 3,
      columnCount: 4,
    },
    diagnostics: [
      {
        severity: "warning",
        code: "empty_header",
        message: 'Column 4 header at line 1 is empty and was assigned default label "Column 4"',
        line: 1,
        column: 4,
      },
      {
        severity: "warning",
        code: "too_few_fields",
        message: "Row 2 has 3 fields (expected 4)",
        line: 3,
      },
      {
        severity: "warning",
        code: "too_many_fields",
        message: "Row 3 has 5 fields (expected 4)",
        line: 4,
      },
    ],
    rawTextLength: 120,
  };

  it("derives deterministic presentation config from LoadedCsvDocument without mutating source", () => {
    const presentation = createDefaultPresentation(mockLoadedDocument.document);

    expect(presentation.rendererId).toBe("table");
    expect(presentation.columns).toHaveLength(4);

    // Checks header preservation
    expect(presentation.columns[0]?.header).toBe("id");
    expect(presentation.columns[1]?.header).toBe("amount");
    expect(presentation.columns[2]?.header).toBe("description");
    expect(presentation.columns[3]?.header).toBe(""); // preserved empty header

    // Checks inferred alignment
    expect(presentation.columns[1]?.align).toBe("right"); // amount is numeric
    expect(presentation.columns[2]?.align).toBe("left"); // description is text

    // Ensures document itself is unmutated
    expect(mockLoadedDocument.document.rowCount).toBe(3);
    expect(mockLoadedDocument.document.rows[0]?.fields).toEqual([
      "tx_1",
      "120.50",
      "Subscription",
      "Active",
    ]);
  });

  it("provides user-friendly fallback label for empty headers without mutating presentation header", () => {
    const presentation = createDefaultPresentation(mockLoadedDocument.document);
    const emptyCol = presentation.columns[3];
    expect(emptyCol).toBeDefined();
    if (!emptyCol) return;

    expect(emptyCol.header).toBe("");
    expect(getColumnDisplayLabel(emptyCol)).toBe("Column 4");
  });

  it("preserves uneven rows with too few or too many fields in source data", () => {
    const rows = mockLoadedDocument.document.rows;

    // Row with too few fields (index 1 has 3 fields, expected 4)
    expect(rows[1]?.fields.length).toBe(3);
    expect(rows[1]?.fields[3]).toBeUndefined();

    // Row with too many fields (index 2 has 5 fields, expected 4)
    expect(rows[2]?.fields.length).toBe(5);
    expect(rows[2]?.fields[4]).toBe("EXTRA_FIELD");
  });

  it("preserves leading formula triggers in raw cell data without evaluating them", () => {
    const docWithFormula: CsvDocument = {
      headers: ["code", "value"],
      rows: [{ index: 0, lineNumber: 2, fields: ["ITEM1", "=cmd|'/c calc'!A1"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    const presentation = createDefaultPresentation(docWithFormula);
    expect(presentation.columns).toHaveLength(2);
    // Raw value in CsvDocument row is preserved intact without mutation or evaluation
    expect(docWithFormula.rows[0]?.fields[1]).toBe("=cmd|'/c calc'!A1");
  });

  it("stores and displays inferred column types in presentation model", () => {
    const presentation = createDefaultPresentation(mockLoadedDocument.document);

    // col_0: "id" (tx_1, tx_2, tx_3 -> string)
    expect(presentation.columns[0]?.inferredType).toBe("string");
    // col_1: "amount" (120.50, -45.00, 99.99 -> number)
    expect(presentation.columns[1]?.inferredType).toBe("number");
    // col_2: "description" (Subscription, Refund, Purchase -> string)
    expect(presentation.columns[2]?.inferredType).toBe("string");
  });

  it("allows overriding column type without mutating source data or other columns", () => {
    const presentation = createDefaultPresentation(mockLoadedDocument.document);

    // Override col_0 (id) to number
    const updated = {
      ...presentation,
      columns: presentation.columns.map((col) =>
        col.id === "col_0" ? { ...col, typeOverride: "number" as const } : col,
      ),
    };

    expect(updated.columns[0]?.inferredType).toBe("string");
    expect(updated.columns[0]?.typeOverride).toBe("number");
    expect(updated.columns[1]?.typeOverride).toBeUndefined();

    // Source cell value is strictly preserved as raw string "tx_1"
    expect(mockLoadedDocument.document.rows[0]?.fields[0]).toBe("tx_1");
  });

  it("supports changing alignment and resetting to automatic defaults", () => {
    const presentation = createDefaultPresentation(mockLoadedDocument.document);
    expect(presentation.columns[1]?.align).toBe("right"); // numeric default

    // User overrides alignment to center
    const centered = {
      ...presentation,
      columns: presentation.columns.map((col) =>
        col.id === "col_1" ? { ...col, align: "center" as const } : col,
      ),
    };
    expect(centered.columns[1]?.align).toBe("center");

    // Resetting presentation recreates default inferred alignments
    const reset = createDefaultPresentation(mockLoadedDocument.document);
    expect(reset.columns[1]?.align).toBe("right");
    expect(reset.columns[1]?.typeOverride).toBeUndefined();
  });

  it("allows duplicate header columns to maintain independent presentation overrides", () => {
    const dupDoc: CsvDocument = {
      headers: ["rate", "rate"],
      rows: [{ index: 0, lineNumber: 2, fields: ["10.5", "20.5"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    const initial = createDefaultPresentation(dupDoc);
    expect(initial.columns[0]?.id).toBe("col_0");
    expect(initial.columns[1]?.id).toBe("col_1");

    // Override only col_1 to string
    const overridden = {
      ...initial,
      columns: initial.columns.map((c) =>
        c.id === "col_1" ? { ...c, typeOverride: "string" as const, align: "left" as const } : c,
      ),
    };

    expect(overridden.columns[0]?.typeOverride).toBeUndefined();
    expect(overridden.columns[0]?.align).toBe("right");
    expect(overridden.columns[1]?.typeOverride).toBe("string");
    expect(overridden.columns[1]?.align).toBe("left");
  });

  it("supports hiding and showing columns, updating visible column derivation without losing column metadata", () => {
    const initial = createDefaultPresentation(mockLoadedDocument.document);
    expect(getVisibleColumns(initial)).toHaveLength(4);

    // Set an override on col_1 (amount)
    const withOverride = setColumnTypeOverride(initial, "col_1", "string");
    // Hide col_1
    const hidden = setColumnVisibility(withOverride, "col_1", false);
    const visibleCols = getVisibleColumns(hidden);
    expect(visibleCols).toHaveLength(3);
    expect(visibleCols.map((c) => c.id)).toEqual(["col_0", "col_2", "col_3"]);

    // Raw document is unmutated
    expect(mockLoadedDocument.document.columnCount).toBe(4);

    // Showing col_1 again restores its typeOverride
    const shown = setColumnVisibility(hidden, "col_1", true);
    expect(getVisibleColumns(shown)).toHaveLength(4);
    expect(shown.columns.find((c) => c.id === "col_1")?.typeOverride).toBe("string");
  });

  it("reorders columns and guarantees that row cell values still resolve to correct sourceIndex", () => {
    const initial = createDefaultPresentation(mockLoadedDocument.document);
    expect(initial.columns.map((c) => c.id)).toEqual(["col_0", "col_1", "col_2", "col_3"]);

    // Move col_2 (description) left twice to become first column
    const movedOnce = moveColumn(initial, "col_2", "left");
    const reordered = moveColumn(movedOnce, "col_2", "left");
    expect(reordered.columns.map((c) => c.id)).toEqual(["col_2", "col_0", "col_1", "col_3"]);

    // Verify visual order is decoupled from source order
    expect(reordered.columns[0]?.header).toBe("description");
    expect(reordered.columns[0]?.sourceIndex).toBe(2);

    // First row cell values mapped by column sourceIndex
    const firstRow = mockLoadedDocument.document.rows[0]!;
    const displayedFields = reordered.columns.map((col) => firstRow.fields[col.sourceIndex]);
    expect(displayedFields).toEqual(["Subscription", "tx_1", "120.50", "Active"]);
  });

  it("sets, validates, and clears column widths in presentation", () => {
    const initial = createDefaultPresentation(mockLoadedDocument.document);

    const withWidth = setColumnWidth(initial, "col_0", 220);
    expect(withWidth.columns[0]?.width).toBe(220);

    // Clear width back to automatic
    const cleared = setColumnWidth(withWidth, "col_0", undefined);
    expect(cleared.columns[0]?.width).toBeUndefined();
  });

  it("resets layout restoring source order and visibility while preserving semantic type overrides", () => {
    const initial = createDefaultPresentation(mockLoadedDocument.document);

    // 1. Override type and alignment on col_0
    const typed = setColumnAlignment(
      setColumnTypeOverride(initial, "col_0", "number"),
      "col_0",
      "center",
    );
    // 2. Reorder col_3 to first
    const reordered = moveColumn(
      moveColumn(moveColumn(typed, "col_3", "left"), "col_3", "left"),
      "col_3",
      "left",
    );
    // 3. Hide col_1 and set width on col_2
    const modified = setColumnWidth(setColumnVisibility(reordered, "col_1", false), "col_2", 300);

    expect(modified.columns.map((c) => c.id)).toEqual(["col_3", "col_0", "col_1", "col_2"]);

    // Reset layout
    const layoutReset = resetLayout(modified);

    // Restores source order
    expect(layoutReset.columns.map((c) => c.id)).toEqual(["col_0", "col_1", "col_2", "col_3"]);
    expect(layoutReset.columns.map((c) => c.sourceIndex)).toEqual([0, 1, 2, 3]);

    // All columns visible
    expect(layoutReset.columns.every((c) => c.visible)).toBe(true);

    // All widths cleared
    expect(layoutReset.columns.every((c) => c.width === undefined)).toBe(true);

    // Type and alignment overrides PRESERVED
    expect(layoutReset.columns[0]?.typeOverride).toBe("number");
    expect(layoutReset.columns[0]?.align).toBe("center");
  });

  it("resets a single column back to default settings using resetColumnPresentation", () => {
    const initial = createDefaultPresentation(mockLoadedDocument.document);
    const modified = setColumnWidth(
      setColumnVisibility(
        setColumnAlignment(setColumnTypeOverride(initial, "col_1", "string"), "col_1", "center"),
        "col_1",
        false,
      ),
      "col_1",
      250,
    );

    const reset = resetColumnPresentation(modified, "col_1");
    const col1 = reset.columns.find((c) => c.id === "col_1");
    expect(col1?.typeOverride).toBeUndefined();
    expect(col1?.align).toBe("right"); // inferred number default
    expect(col1?.visible).toBe(true);
    expect(col1?.width).toBeUndefined();
  });
});
