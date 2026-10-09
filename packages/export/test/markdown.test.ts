import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import type { PresentationConfig } from "@csvora/schemas";
import { exportMarkdown } from "../src";

describe("@csvora/export exportMarkdown", () => {
  const document: CsvDocument = {
    headers: ["item", "price", "status", "notes"],
    rows: [
      {
        index: 0,
        lineNumber: 2,
        fields: ["Widget A", "1200", "active", "Standard | Normal"],
      },
      {
        index: 1,
        lineNumber: 3,
        fields: ["Widget B", "450", "pending", "Line 1\nLine 2"],
      },
      {
        index: 2,
        lineNumber: 4,
        fields: ["Widget C", "0", "archived", ""],
      },
    ],
    delimiter: ",",
    rowCount: 3,
    columnCount: 4,
  };

  const presentation: PresentationConfig = {
    rendererId: "table",
    columns: [
      {
        id: "col_0",
        sourceIndex: 0,
        header: "item",
        visible: true,
        align: "left",
        inferredType: "string",
      },
      {
        id: "col_1",
        sourceIndex: 1,
        header: "price",
        visible: true,
        align: "right",
        inferredType: "number",
        format: {
          kind: "currency",
          options: {
            currency: "USD",
            locale: "en-US",
            maximumFractionDigits: 0,
          },
        },
      },
      {
        id: "col_2",
        sourceIndex: 2,
        header: "status",
        visible: false, // hidden!
        align: "center",
        inferredType: "string",
      },
      {
        id: "col_3",
        sourceIndex: 3,
        header: "notes",
        visible: true,
        align: "left",
        inferredType: "string",
      },
    ],
    rendererConfigs: {},
  };

  it("exports Markdown table with headers, alignment row, and visible columns in presentation order", () => {
    const result = exportMarkdown(document, presentation, { filename: "inventory.csv" });

    expect(result.mimeType).toBe("text/markdown;charset=utf-8");
    expect(result.fileExtension).toBe("md");
    expect(result.suggestedFilename).toBe("inventory.md");

    const lines = result.content.trim().split("\n");
    expect(lines).toHaveLength(5); // Header + Alignment + 3 data rows

    // Header line
    expect(lines[0]).toBe("| item | price | notes |");

    // Alignment line: left (:---), right (---:), left (:---)
    expect(lines[1]).toBe("| :--- | ---: | :--- |");

    // Hidden column 'status' must not appear
    expect(result.content).not.toContain("status");
    expect(result.content).not.toContain("active");
  });

  it("escapes table-breaking pipes in cell content", () => {
    const result = exportMarkdown(document, presentation);
    // "Standard | Normal" -> "Standard \| Normal"
    expect(result.content).toContain("Standard \\| Normal");
  });

  it("handles newlines in cell content without breaking table rows", () => {
    const result = exportMarkdown(document, presentation);
    // "Line 1\nLine 2" -> "Line 1<br />Line 2"
    expect(result.content).toContain("Line 1<br />Line 2");
  });

  it("formats semantic currency values in Markdown cells", () => {
    const result = exportMarkdown(document, presentation);
    expect(result.content).toContain("$1,200");
    expect(result.content).toContain("$450");
    expect(result.content).toContain("$0");
  });

  it("handles center alignment properly", () => {
    const presWithCenter: PresentationConfig = {
      ...presentation,
      columns: presentation.columns.map((c) => (c.id === "col_0" ? { ...c, align: "center" } : c)),
    };

    const result = exportMarkdown(document, presWithCenter);
    const lines = result.content.trim().split("\n");
    expect(lines[1]).toContain("| :---: |");
  });

  it("handles Unicode without corruption", () => {
    const unicodeDoc: CsvDocument = {
      headers: ["symbol", "name"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["₹", "Rupee"] },
        { index: 1, lineNumber: 3, fields: ["🇯🇵", "Japan"] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 2,
    };

    const pres: PresentationConfig = {
      rendererId: "table",
      columns: [
        {
          id: "col_0",
          sourceIndex: 0,
          header: "symbol",
          visible: true,
          align: "center",
          inferredType: "string",
        },
        {
          id: "col_1",
          sourceIndex: 1,
          header: "name",
          visible: true,
          align: "left",
          inferredType: "string",
        },
      ],
      rendererConfigs: {},
    };

    const result = exportMarkdown(unicodeDoc, pres);
    expect(result.content).toContain("| ₹ | Rupee |");
    expect(result.content).toContain("| 🇯🇵 | Japan |");
  });

  it("escapes markdown special characters in values to prevent unintended formatting", () => {
    const docWithMd: CsvDocument = {
      headers: ["text"],
      rows: [{ index: 0, lineNumber: 2, fields: ["*bold* and [link](url) <script>"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 1,
    };

    const pres: PresentationConfig = {
      rendererId: "table",
      columns: [
        {
          id: "col_0",
          sourceIndex: 0,
          header: "text",
          visible: true,
          align: "left",
          inferredType: "string",
        },
      ],
      rendererConfigs: {},
    };

    const result = exportMarkdown(docWithMd, pres);
    expect(result.content).not.toContain("<script>");
    expect(result.content).toContain("&lt;script&gt;");
  });

  it("handles empty document or zero visible columns defensively without throwing", () => {
    const emptyDoc: CsvDocument = {
      headers: [],
      rows: [],
      delimiter: ",",
      rowCount: 0,
      columnCount: 0,
    };

    const emptyPres: PresentationConfig = {
      rendererId: "table",
      columns: [],
      rendererConfigs: {},
    };

    const result = exportMarkdown(emptyDoc, emptyPres);
    expect(result.content).toBe("");
  });

  it("never mutates source CsvDocument or PresentationConfig", () => {
    const originalField = document.rows[0]?.fields[3];
    exportMarkdown(document, presentation);
    expect(document.rows[0]?.fields[3]).toBe(originalField);
  });
});
