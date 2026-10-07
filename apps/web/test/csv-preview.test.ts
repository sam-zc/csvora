import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import { createDefaultPresentation, getColumnDisplayLabel } from "@csvora/table-engine";
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
});
