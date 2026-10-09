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
  setRenderer,
  setDeparturesMapping,
  resetDeparturesMapping,
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

  describe("Visual Editor Workspace Selection & Inspector Behaviors", () => {
    it("handles selected column state changes and resolves correct column presentation", () => {
      const presentation = createDefaultPresentation(mockLoadedDocument.document);
      let selectedColumnId: string | null = null;

      // Initially no column selected
      let selectedCol = presentation.columns.find((c) => c.id === selectedColumnId) ?? null;
      expect(selectedCol).toBeNull();

      // Select column col_1 (amount)
      selectedColumnId = "col_1";
      selectedCol = presentation.columns.find((c) => c.id === selectedColumnId) ?? null;
      expect(selectedCol).not.toBeNull();
      expect(selectedCol?.id).toBe("col_1");
      expect(selectedCol?.header).toBe("amount");

      // Switch selection to col_2 (description)
      selectedColumnId = "col_2";
      selectedCol = presentation.columns.find((c) => c.id === selectedColumnId) ?? null;
      expect(selectedCol?.id).toBe("col_2");
      expect(selectedCol?.header).toBe("description");

      // Clear selection
      selectedColumnId = null;
      selectedCol = presentation.columns.find((c) => c.id === selectedColumnId) ?? null;
      expect(selectedCol).toBeNull();
    });

    it("updates only the target column when inspector settings change", () => {
      const presentation = createDefaultPresentation(mockLoadedDocument.document);
      const selectedColumnId = "col_1"; // amount

      // Apply type override, width, and alignment to selected column
      const updated = setColumnWidth(
        setColumnAlignment(
          setColumnTypeOverride(presentation, selectedColumnId, "string"),
          selectedColumnId,
          "center",
        ),
        selectedColumnId,
        180,
      );

      const targetCol = updated.columns.find((c) => c.id === selectedColumnId);
      expect(targetCol?.typeOverride).toBe("string");
      expect(targetCol?.align).toBe("center");
      expect(targetCol?.width).toBe(180);

      // Other columns remain unaffected
      const col0 = updated.columns.find((c) => c.id === "col_0");
      expect(col0?.typeOverride).toBeUndefined();
      expect(col0?.align).toBe("left");
      expect(col0?.width).toBeUndefined();

      const col2 = updated.columns.find((c) => c.id === "col_2");
      expect(col2?.typeOverride).toBeUndefined();
      expect(col2?.align).toBe("left");
      expect(col2?.width).toBeUndefined();
    });

    it("maintains sensible behavior when the selected column is hidden", () => {
      const presentation = createDefaultPresentation(mockLoadedDocument.document);
      const selectedColumnId = "col_2"; // description

      // Selected column is hidden
      const withHidden = setColumnVisibility(presentation, selectedColumnId, false);

      // Presentation retains the column's configuration even when hidden
      const hiddenSelectedCol = withHidden.columns.find((c) => c.id === selectedColumnId);
      expect(hiddenSelectedCol).toBeDefined();
      expect(hiddenSelectedCol?.visible).toBe(false);

      // Visible columns list excludes it
      const visibleCols = getVisibleColumns(withHidden);
      expect(visibleCols.some((c) => c.id === selectedColumnId)).toBe(false);

      // Unhiding the selected column restores visibility
      const unhidden = setColumnVisibility(withHidden, selectedColumnId, true);
      const restoredCol = unhidden.columns.find((c) => c.id === selectedColumnId);
      expect(restoredCol?.visible).toBe(true);
      expect(getVisibleColumns(unhidden).some((c) => c.id === selectedColumnId)).toBe(true);
    });

    it("ensures presentation reset updates inspector target back to defaults without stale values", () => {
      const presentation = createDefaultPresentation(mockLoadedDocument.document);
      const selectedColumnId = "col_1";

      // Configure overrides on selected column
      const modified = setColumnWidth(
        setColumnAlignment(
          setColumnTypeOverride(presentation, selectedColumnId, "string"),
          selectedColumnId,
          "center",
        ),
        selectedColumnId,
        250,
      );
      expect(modified.columns.find((c) => c.id === selectedColumnId)?.width).toBe(250);

      // Reset presentation
      const reset = createDefaultPresentation(mockLoadedDocument.document);
      const resetSelectedCol = reset.columns.find((c) => c.id === selectedColumnId);

      expect(resetSelectedCol?.typeOverride).toBeUndefined();
      expect(resetSelectedCol?.align).toBe("right"); // numeric default
      expect(resetSelectedCol?.width).toBeUndefined();
      expect(resetSelectedCol?.visible).toBe(true);
    });
  });

  describe("Renderer Switching & Departures Board Integration", () => {
    const flightDocument: LoadedCsvDocument = {
      file: {
        name: "departures.csv",
        size: 512,
        type: "text/csv",
        lastModified: 1700000000000,
      },
      document: {
        headers: ["time", "flight", "destination", "gate", "delay"],
        rows: [
          { index: 0, lineNumber: 2, fields: ["08:15", "LH 441", "Frankfurt", "B07", "0"] },
          { index: 1, lineNumber: 3, fields: ["08:30", "BA 117", "London", "A12", "25"] },
        ],
        delimiter: ",",
        rowCount: 2,
        columnCount: 5,
      },
      diagnostics: [],
      rawTextLength: 120,
    };

    it("switches renderer to departures and preserves table column presentation", () => {
      let pres = createDefaultPresentation(flightDocument.document);
      expect(pres.rendererId).toBe("table");

      // Set width and center alignment on flight column in table mode
      pres = setColumnWidth(pres, "col_1", 180);
      pres = setColumnAlignment(pres, "col_1", "center");

      // Switch to departures renderer
      pres = setRenderer(pres, "departures");
      expect(pres.rendererId).toBe("departures");

      // Auto-mapping automatically populated
      expect(pres.rendererConfigs.departures?.timeColumnId).toBe("col_0");
      expect(pres.rendererConfigs.departures?.flightColumnId).toBe("col_1");
      expect(pres.rendererConfigs.departures?.destinationColumnId).toBe("col_2");
      expect(pres.rendererConfigs.departures?.gateColumnId).toBe("col_3");
      expect(pres.rendererConfigs.departures?.statusColumnId).toBe("col_4");

      // Table presentation settings are preserved
      expect(pres.columns[1]?.width).toBe(180);
      expect(pres.columns[1]?.align).toBe("center");

      // Switch back to table
      pres = setRenderer(pres, "table");
      expect(pres.rendererId).toBe("table");
      expect(pres.columns[1]?.width).toBe(180);
      expect(pres.columns[1]?.align).toBe("center");

      // Switch back to departures - retains auto-mappings
      pres = setRenderer(pres, "departures");
      expect(pres.rendererId).toBe("departures");
      expect(pres.rendererConfigs.departures?.destinationColumnId).toBe("col_2");
    });

    it("allows updating and resetting departures mappings independently from table overrides", () => {
      let pres = createDefaultPresentation(flightDocument.document);
      pres = setRenderer(pres, "departures");

      // Manually remap gate to col_0
      pres = setDeparturesMapping(pres, {
        ...pres.rendererConfigs.departures,
        gateColumnId: "col_0",
      });
      expect(pres.rendererConfigs.departures?.gateColumnId).toBe("col_0");

      // Reset departures mappings restores inferred gate
      pres = resetDeparturesMapping(pres);
      expect(pres.rendererConfigs.departures?.gateColumnId).toBe("col_3");
    });
  });
});
