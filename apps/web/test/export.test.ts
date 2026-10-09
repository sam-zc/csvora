import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import {
  exportFormattedCsv,
  exportJson,
  exportMarkdown,
  exportRawCsv,
  type ExportResult,
} from "@csvora/export";
import type { PresentationConfig } from "@csvora/schemas";
import { triggerBrowserDownload } from "../src/features/export/download";

describe("Web Export Integration & Download Layer", () => {
  const document: CsvDocument = {
    headers: ["id", "revenue", "status"],
    rows: [
      { index: 0, lineNumber: 2, fields: ["1", "1250000", "active"] },
      { index: 1, lineNumber: 3, fields: ["2", "450000", "pending"] },
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
        conditionalRules: [],
      },
      {
        id: "col_1",
        sourceIndex: 1,
        header: "revenue",
        visible: true,
        align: "right",
        inferredType: "number",
        format: {
          kind: "currency",
          options: { currency: "INR", locale: "en-IN" },
        },
        conditionalRules: [],
      },
      {
        id: "col_2",
        sourceIndex: 2,
        header: "status",
        visible: false, // hidden column
        align: "left",
        inferredType: "string",
        conditionalRules: [],
      },
    ],
    rendererConfigs: {},
  };

  it("exports Raw CSV with suggested filename", () => {
    const res = exportRawCsv(document, { filename: "company.csv" });
    expect(res.suggestedFilename).toBe("company.csv");
    expect(res.mimeType).toBe("text/csv;charset=utf-8");
    expect(res.content).toContain("id,revenue,status\r\n");
    expect(res.content).toContain("1,1250000,active\r\n");
  });

  it("exports Formatted CSV omitting hidden status and applying INR formatting", () => {
    const res = exportFormattedCsv(document, presentation, { filename: "company.csv" });
    expect(res.suggestedFilename).toBe("company-formatted.csv");
    expect(res.content.startsWith("id,revenue\r\n")).toBe(true);
    expect(res.content).not.toContain("status");
    expect(res.content).toContain('"₹12,50,000"');
    expect(res.content).toContain('"₹4,50,000"');
  });

  it("exports Markdown table with alignment and formatted currency", () => {
    const res = exportMarkdown(document, presentation, { filename: "company.csv" });
    expect(res.suggestedFilename).toBe("company.md");
    expect(res.content).toContain("| id | revenue |");
    expect(res.content).toContain("| :--- | ---: |");
    expect(res.content).toContain("| 1 | ₹12,50,000 |");
    expect(res.content).not.toContain("status");
  });

  it("exports Lossless JSON preserving columns and rows", () => {
    const res = exportJson(document, { filename: "company.csv" });
    expect(res.suggestedFilename).toBe("company.json");
    const parsed = JSON.parse(res.content);
    expect(parsed.columns).toHaveLength(3);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual(["1", "1250000", "active"]);
  });

  it("triggerBrowserDownload handles mock DOM lifecycle cleanly", () => {
    let createdUrl = "";
    let clicked = false;
    let appendedChild: unknown = null;
    let removedChild: unknown = null;

    // Setup global window and document mocks
    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    const originalDocument = (globalThis as unknown as { document?: unknown }).document;
    const originalURL = (globalThis as unknown as { URL?: unknown }).URL;

    (globalThis as unknown as { window: unknown }).window = {};
    (globalThis as unknown as { URL: unknown }).URL = {
      createObjectURL: () => {
        createdUrl = "blob:http://localhost/test-uuid";
        return createdUrl;
      },
      revokeObjectURL: () => {},
    };

    interface MockAnchor {
      href: string;
      download: string;
      style: Record<string, string>;
      click: () => void;
    }

    const mockLink: MockAnchor = {
      href: "",
      download: "",
      style: {},
      click: () => {
        clicked = true;
      },
    };

    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === "a") return mockLink;
        return {};
      },
      body: {
        appendChild: (el: unknown) => {
          appendedChild = el;
        },
        removeChild: (el: unknown) => {
          removedChild = el;
        },
      },
    };

    try {
      const result: ExportResult = {
        content: "id,name\r\n1,Alpha\r\n",
        mimeType: "text/csv;charset=utf-8",
        fileExtension: "csv",
        suggestedFilename: "test.csv",
      };

      triggerBrowserDownload(result);

      expect(createdUrl).toBe("blob:http://localhost/test-uuid");
      expect(mockLink.href).toBe("blob:http://localhost/test-uuid");
      expect(mockLink.download).toBe("test.csv");
      expect(clicked).toBe(true);
      expect(appendedChild).toBe(mockLink);
      expect(removedChild).toBe(mockLink);
    } finally {
      // Restore globals
      (globalThis as unknown as { window?: unknown }).window = originalWindow;
      (globalThis as unknown as { document?: unknown }).document = originalDocument;
      (globalThis as unknown as { URL?: unknown }).URL = originalURL;
    }
  });
});
