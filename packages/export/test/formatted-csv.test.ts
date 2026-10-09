import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import type { PresentationConfig } from "@csvora/schemas";
import { exportFormattedCsv } from "../src";

describe("@csvora/export exportFormattedCsv", () => {
  const document: CsvDocument = {
    headers: ["id", "name", "revenue", "active", "margin"],
    rows: [
      {
        index: 0,
        lineNumber: 2,
        fields: ["1", "Alpha", "1250000", "true", "0.25"],
      },
      {
        index: 1,
        lineNumber: 3,
        fields: ["2", "Beta", "850000", "false", "0.15"],
      },
      {
        index: 2,
        lineNumber: 4,
        fields: ["3", "Gamma", "N/A", "true", "0.05"], // invalid raw fallback
      },
    ],
    delimiter: ",",
    rowCount: 3,
    columnCount: 5,
  };

  const presentation: PresentationConfig = {
    rendererId: "table",
    columns: [
      // Reordered: name first, then revenue, then margin, then id, and active is hidden!
      {
        id: "col_1",
        sourceIndex: 1,
        header: "name",
        visible: true,
        align: "left",
        inferredType: "string",
      },
      {
        id: "col_2",
        sourceIndex: 2,
        header: "revenue",
        visible: true,
        align: "right",
        inferredType: "number",
        format: {
          kind: "currency",
          options: {
            currency: "INR",
            locale: "en-IN",
          },
        },
      },
      {
        id: "col_4",
        sourceIndex: 4,
        header: "margin",
        visible: true,
        align: "right",
        inferredType: "number",
        format: {
          kind: "percent",
          options: {
            locale: "en-US",
          },
        },
      },
      {
        id: "col_0",
        sourceIndex: 0,
        header: "id",
        visible: true,
        align: "right",
        inferredType: "string",
        format: {
          kind: "text",
          prefix: "#",
        },
      },
      {
        id: "col_3",
        sourceIndex: 3,
        header: "active",
        visible: false, // HIDDEN COLUMN
        align: "center",
        inferredType: "boolean",
      },
    ],
    rendererConfigs: {},
  };

  it("exports formatted CSV respecting presentation column order and visible columns only", () => {
    const result = exportFormattedCsv(document, presentation, { filename: "company.csv" });

    expect(result.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.fileExtension).toBe("csv");
    expect(result.suggestedFilename).toBe("company-formatted.csv");

    // Header row respects presentation order and omits hidden column 'active'
    expect(result.content.startsWith("name,revenue,margin,id\r\n")).toBe(true);
    expect(result.content).not.toContain("active");

    // Values formatted semantically
    // INR formatting: ₹12,50,000 and ₹8,50,000 (enclosed in quotes because of currency symbol / comma)
    expect(result.content).toContain('"₹12,50,000"');
    expect(result.content).toContain('"₹8,50,000"');

    // Percentage formatting
    expect(result.content).toContain("25%");
    expect(result.content).toContain("15%");

    // Prefix applied to id
    expect(result.content).toContain("#1");
    expect(result.content).toContain("#2");
  });

  it("falls back gracefully to raw string when cell data is invalid for format", () => {
    const result = exportFormattedCsv(document, presentation);
    // Row 3 revenue is 'N/A' which is non-numeric -> exported as N/A without crash or NaN
    expect(result.content).toContain("Gamma,N/A,5%,#3");
  });

  it("applies safe formula escaping to formatted output", () => {
    const formulaDoc: CsvDocument = {
      headers: ["title", "calc"],
      rows: [{ index: 0, lineNumber: 2, fields: ["Summary", "=SUM(A1:B1)"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    const formulaPres: PresentationConfig = {
      rendererId: "table",
      columns: [
        {
          id: "col_0",
          sourceIndex: 0,
          header: "title",
          visible: true,
          align: "left",
          inferredType: "string",
        },
        {
          id: "col_1",
          sourceIndex: 1,
          header: "calc",
          visible: true,
          align: "right",
          inferredType: "string",
        },
      ],
      rendererConfigs: {},
    };

    const result = exportFormattedCsv(formulaDoc, formulaPres);
    expect(result.content).toContain("'=SUM(A1:B1)");
  });

  it("handles malformed rows by extracting only mapped presentation columns", () => {
    const malformedDoc: CsvDocument = {
      headers: ["h1", "h2"],
      rows: [{ index: 0, lineNumber: 2, fields: ["val1", "val2", "EXTRA_UNMAPPED"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    const pres: PresentationConfig = {
      rendererId: "table",
      columns: [
        {
          id: "col_0",
          sourceIndex: 0,
          header: "h1",
          visible: true,
          align: "left",
          inferredType: "string",
        },
        {
          id: "col_1",
          sourceIndex: 1,
          header: "h2",
          visible: true,
          align: "left",
          inferredType: "string",
        },
      ],
      rendererConfigs: {},
    };

    const result = exportFormattedCsv(malformedDoc, pres);
    expect(result.content).toBe("h1,h2\r\nval1,val2\r\n");
    expect(result.content).not.toContain("EXTRA_UNMAPPED");
  });

  it("never mutates the input CsvDocument or PresentationConfig", () => {
    const originalField = document.rows[0]?.fields[2];
    const originalVis = presentation.columns[4]?.visible;

    exportFormattedCsv(document, presentation);

    expect(document.rows[0]?.fields[2]).toBe(originalField);
    expect(presentation.columns[4]?.visible).toBe(originalVis);
  });
});
