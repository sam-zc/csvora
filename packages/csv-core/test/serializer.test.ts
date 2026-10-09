import { describe, expect, it } from "bun:test";
import { type CsvDocument, escapeFormulaValue, serializeCsv } from "../src";

describe("@csvora/csv-core serializeCsv", () => {
  it("serializes standard rows with RFC 4180 CRLF line endings", () => {
    const doc: CsvDocument = {
      headers: ["name", "age", "city"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Alice", "30", "Paris"] },
        { index: 1, lineNumber: 3, fields: ["Bob", "25", "London"] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 3,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe("name,age,city\r\nAlice,30,Paris\r\nBob,25,London\r\n");
  });

  it("quotes fields containing delimiter, quotes, or newlines", () => {
    const doc: CsvDocument = {
      headers: ["title", "notes"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Hello, World", 'Said "Hi"'] },
        { index: 1, lineNumber: 3, fields: ["Multi\nline", "Standard"] },
        { index: 2, lineNumber: 4, fields: ["CRLF\r\nValue", "Normal"] },
      ],
      delimiter: ",",
      rowCount: 3,
      columnCount: 2,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe(
      'title,notes\r\n"Hello, World","Said ""Hi"""\r\n"Multi\nline",Standard\r\n"CRLF\r\nValue",Normal\r\n',
    );
  });

  it("quotes fields with leading or trailing whitespace", () => {
    const doc: CsvDocument = {
      headers: ["item", "code"],
      rows: [{ index: 0, lineNumber: 2, fields: [" padded ", "normal"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 2,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe('item,code\r\n" padded ",normal\r\n');
  });

  it("handles custom delimiters such as semicolon and tab", () => {
    const doc: CsvDocument = {
      headers: ["col1", "col2"],
      rows: [{ index: 0, lineNumber: 2, fields: ["a;b", "c"] }],
      delimiter: ";",
      rowCount: 1,
      columnCount: 2,
    };

    // Auto-uses document delimiter ';'
    const csvSemicolon = serializeCsv(doc);
    expect(csvSemicolon).toBe('col1;col2\r\n"a;b";c\r\n');

    // Overrides with tab
    const csvTab = serializeCsv(doc, { delimiter: "\t" });
    expect(csvTab).toBe("col1\tcol2\r\na;b\tc\r\n");
  });

  it("handles empty fields and trailing empty fields correctly", () => {
    const doc: CsvDocument = {
      headers: ["a", "b", "c"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["", "middle", ""] },
        { index: 1, lineNumber: 3, fields: ["", "", ""] },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 3,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe("a,b,c\r\n,middle,\r\n,,\r\n");
  });

  it("preserves empty headers and duplicate headers", () => {
    const doc: CsvDocument = {
      headers: ["amount", "", "amount"],
      rows: [{ index: 0, lineNumber: 2, fields: ["10", "foo", "20"] }],
      delimiter: ",",
      rowCount: 1,
      columnCount: 3,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe("amount,,amount\r\n10,foo,20\r\n");
  });

  it("preserves malformed extra fields without truncating data", () => {
    const doc: CsvDocument = {
      headers: ["id", "val"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["1", "a", "extra1", "extra2"] },
        { index: 1, lineNumber: 3, fields: ["2"] }, // fewer fields
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 2,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe("id,val\r\n1,a,extra1,extra2\r\n2\r\n");
  });

  it("handles Unicode characters without corruption", () => {
    const doc: CsvDocument = {
      headers: ["language", "text"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["Tamil", "வணக்கம்"] },
        { index: 1, lineNumber: 3, fields: ["CJK", "東京, 日本"] },
        { index: 2, lineNumber: 4, fields: ["Emoji", "🚀✨"] },
        { index: 3, lineNumber: 5, fields: ["European", "Müller & René"] },
      ],
      delimiter: ",",
      rowCount: 4,
      columnCount: 2,
    };

    const csv = serializeCsv(doc);
    expect(csv).toBe(
      'language,text\r\nTamil,வணக்கம்\r\nCJK,"東京, 日本"\r\nEmoji,🚀✨\r\nEuropean,Müller & René\r\n',
    );
  });

  describe("formula safety policy", () => {
    const formulaDoc: CsvDocument = {
      headers: ["command", "calc", "contact", "delta"],
      rows: [
        {
          index: 0,
          lineNumber: 2,
          fields: ["=cmd|' /C calc'!A0", "+12345", "@SUM(A1)", "-45"],
        },
        {
          index: 1,
          lineNumber: 3,
          fields: ["   =HIDDEN_FORMULA()", "normal", "test", "0"],
        },
      ],
      delimiter: ",",
      rowCount: 2,
      columnCount: 4,
    };

    it("escapes formula triggers by prefixing with ' by default", () => {
      const csv = serializeCsv(formulaDoc);
      // Leading = is prefixed with '
      expect(csv).toContain("'=cmd|' /C calc'!A0");
      expect(csv).toContain("'+12345");
      expect(csv).toContain("'@SUM(A1)");
      expect(csv).toContain("'-45");
      expect(csv).toContain("'   =HIDDEN_FORMULA()");
    });

    it("preserves formula characters when formulaPolicy is 'preserve'", () => {
      const csv = serializeCsv(formulaDoc, { formulaPolicy: "preserve" });
      expect(csv).toContain("=cmd|' /C calc'!A0");
      expect(csv).toContain("+12345");
      expect(csv).toContain("@SUM(A1)");
      expect(csv).toContain("-45");
      expect(csv).not.toContain("'+12345");
    });

    it("escapeFormulaValue helper function tests", () => {
      expect(escapeFormulaValue("=SUM(A1:B1)")).toBe("'=SUM(A1:B1)");
      expect(escapeFormulaValue("+42")).toBe("'+42");
      expect(escapeFormulaValue("-10")).toBe("'-10");
      expect(escapeFormulaValue("@calc")).toBe("'@calc");
      expect(escapeFormulaValue("  =SUM()")).toBe("'  =SUM()");
      expect(escapeFormulaValue("ordinary text")).toBe("ordinary text");
      expect(escapeFormulaValue("")).toBe("");
    });

    it("never mutates the input CsvDocument", () => {
      const originalField = formulaDoc.rows[0]?.fields[0];
      serializeCsv(formulaDoc, { formulaPolicy: "escape" });
      expect(formulaDoc.rows[0]?.fields[0]).toBe(originalField);
    });
  });

  describe("UTF-8 BOM support", () => {
    it("prepends \\uFEFF when includeBom is true", () => {
      const doc: CsvDocument = {
        headers: ["a"],
        rows: [{ index: 0, lineNumber: 2, fields: ["1"] }],
        delimiter: ",",
        rowCount: 1,
        columnCount: 1,
      };

      const withBom = serializeCsv(doc, { includeBom: true });
      expect(withBom.startsWith("\uFEFF")).toBe(true);
      expect(withBom).toBe("\uFEFFa\r\n1\r\n");

      const withoutBom = serializeCsv(doc, { includeBom: false });
      expect(withoutBom.startsWith("\uFEFF")).toBe(false);
      expect(withoutBom).toBe("a\r\n1\r\n");
    });
  });

  describe("edge cases", () => {
    it("handles empty document with 0 rows and 0 headers", () => {
      const doc: CsvDocument = {
        headers: [],
        rows: [],
        delimiter: ",",
        rowCount: 0,
        columnCount: 0,
      };

      expect(serializeCsv(doc)).toBe("");
    });

    it("handles header-only document with 0 rows", () => {
      const doc: CsvDocument = {
        headers: ["col1", "col2"],
        rows: [],
        delimiter: ",",
        rowCount: 0,
        columnCount: 2,
      };

      expect(serializeCsv(doc)).toBe("col1,col2\r\n");
    });

    it("handles document without headers (header: false option)", () => {
      const doc: CsvDocument = {
        headers: ["ignored1", "ignored2"],
        rows: [{ index: 0, lineNumber: 2, fields: ["x", "y"] }],
        delimiter: ",",
        rowCount: 1,
        columnCount: 2,
      };

      expect(serializeCsv(doc, { header: false })).toBe("x,y\r\n");
    });
  });
});
