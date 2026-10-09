import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import type { PresentationConfig } from "@csvora/schemas";
import { exportFormattedCsv, exportJson, exportMarkdown, exportRawCsv } from "../src";

describe("@csvora/export source-data immutability verification", () => {
  it("guarantees CsvDocument and PresentationConfig are never mutated across all export formats", () => {
    const originalHeaders = ["id", "formula", "amount"];
    const originalRow0Fields = ["1", "=SUM(A1:A2)", "1000"];
    const originalRow1Fields = ["2", "-50", "2000"];

    const document: CsvDocument = {
      headers: [...originalHeaders],
      rows: [
        { index: 0, lineNumber: 2, fields: [...originalRow0Fields] },
        { index: 1, lineNumber: 3, fields: [...originalRow1Fields] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 3,
    };

    const presentation: PresentationConfig = {
      rendererId: "table",
      columns: [
        {
          id: "col_0",
          sourceIndex: 0,
          header: "id",
          visible: true,
          align: "left",
          inferredType: "string",
        },
        {
          id: "col_2",
          sourceIndex: 2,
          header: "amount",
          visible: true,
          align: "right",
          inferredType: "number",
          format: {
            kind: "currency",
            options: { currency: "USD", locale: "en-US" },
          },
        },
        {
          id: "col_1",
          sourceIndex: 1,
          header: "formula",
          visible: false, // hidden
          align: "left",
          inferredType: "string",
        },
      ],
      rendererConfigs: {},
    };

    // Deep snapshots before exports
    const docSnapshot = JSON.stringify(document);
    const presSnapshot = JSON.stringify(presentation);

    // Run all 4 exports
    exportRawCsv(document, { formulaPolicy: "escape" });
    exportFormattedCsv(document, presentation, { formulaPolicy: "escape" });
    exportMarkdown(document, presentation);
    exportJson(document);

    // Verify snapshots match identically
    expect(JSON.stringify(document)).toBe(docSnapshot);
    expect(JSON.stringify(presentation)).toBe(presSnapshot);

    // Verify row arrays and fields
    expect(document.headers).toEqual(originalHeaders);
    expect(document.rows[0]?.fields).toEqual(originalRow0Fields);
    expect(document.rows[1]?.fields).toEqual(originalRow1Fields);
    expect(presentation.columns[2]?.visible).toBe(false);
  });
});
