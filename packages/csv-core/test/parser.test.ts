import { describe, expect, it } from "bun:test";
import { parseCsv } from "../src/parser";
import type { CsvDiagnostic, CsvRow } from "../src/types";

function getRow(rows: readonly CsvRow[], index: number): CsvRow {
  const row = rows[index];
  if (!row) {
    throw new Error(`Expected row at index ${index} to exist`);
  }
  return row;
}

function getDiagnostic(diagnostics: readonly CsvDiagnostic[], index: number): CsvDiagnostic {
  const diag = diagnostics[index];
  if (!diag) {
    throw new Error(`Expected diagnostic at index ${index} to exist`);
  }
  return diag;
}

describe("parseCsv", () => {
  it("1. parses basic CSV", () => {
    const csv = "name,age\nSam,24";
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["name", "age"]);
    expect(result.document.rowCount).toBe(1);
    expect(result.document.columnCount).toBe(2);
    expect(getRow(result.document.rows, 0).fields).toEqual(["Sam", "24"]);
    expect(getRow(result.document.rows, 0).index).toBe(0);
    expect(getRow(result.document.rows, 0).lineNumber).toBe(2);
  });

  it("2. preserves commas inside quoted fields", () => {
    const csv = 'name,description\nCSVora,"CSV, but beautiful"';
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(getRow(result.document.rows, 0).fields).toEqual(["CSVora", "CSV, but beautiful"]);
  });

  it("3. unescapes double quotes inside quoted fields", () => {
    const csv = 'name,quote\nCSVora,"He said ""hello"""';
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(getRow(result.document.rows, 0).fields).toEqual(["CSVora", 'He said "hello"']);
  });

  it("4. handles multiline quoted field within a single logical row", () => {
    const csv = 'id,description\n1,"line one\nline two"';
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.rowCount).toBe(1);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "line one\nline two"]);
  });

  it("5. supports CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n3,4\r\n";
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["a", "b"]);
    expect(result.document.rowCount).toBe(2);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "2"]);
    expect(getRow(result.document.rows, 1).fields).toEqual(["3", "4"]);
  });

  it("6. supports LF line endings", () => {
    const csv = "a,b\n1,2\n3,4\n";
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["a", "b"]);
    expect(result.document.rowCount).toBe(2);
  });

  it("7. supports configurable delimiters (; tab |)", () => {
    const semicolonCsv = "name;age\nJohn;30\nJane;25";
    const tabCsv = "name\tage\nJohn\t30\nJane\t25";
    const pipeCsv = "name|age\nJohn|30\nJane|25";

    const semiResult = parseCsv(semicolonCsv, { delimiter: ";" });
    expect(semiResult.document.delimiter).toBe(";");
    expect(semiResult.document.headers).toEqual(["name", "age"]);
    expect(getRow(semiResult.document.rows, 0).fields).toEqual(["John", "30"]);

    const tabResult = parseCsv(tabCsv, { delimiter: "\t" });
    expect(tabResult.document.delimiter).toBe("\t");
    expect(tabResult.document.rows[0]?.fields).toEqual(["John", "30"]);

    const pipeResult = parseCsv(pipeCsv, { delimiter: "|" });
    expect(pipeResult.document.delimiter).toBe("|");
    expect(getRow(pipeResult.document.rows, 0).fields).toEqual(["John", "30"]);
  });

  it("8. auto-detects delimiter when not provided", () => {
    const semicolonCsv = "col1;col2;col3\na;b;c\nd;e;f";
    const result = parseCsv(semicolonCsv);

    expect(result.document.delimiter).toBe(";");
    expect(result.document.headers).toEqual(["col1", "col2", "col3"]);
    expect(getRow(result.document.rows, 0).fields).toEqual(["a", "b", "c"]);
  });

  it("9. ignores delimiter characters inside quoted cells during detection and parsing", () => {
    const csv = 'name,desc,count\nitem1,"semicolon;and;pipe|inside",10\nitem2,"more;stuff",20';
    const result = parseCsv(csv);

    expect(result.document.delimiter).toBe(",");
    expect(result.document.headers).toEqual(["name", "desc", "count"]);
    expect(getRow(result.document.rows, 0).fields).toEqual([
      "item1",
      "semicolon;and;pipe|inside",
      "10",
    ]);
  });

  it("10. handles empty input and whitespace-only input", () => {
    const emptyResult = parseCsv("");
    expect(emptyResult.success).toBe(true);
    expect(emptyResult.document.headers).toEqual([]);
    expect(emptyResult.document.rows).toEqual([]);
    expect(emptyResult.document.rowCount).toBe(0);
    expect(emptyResult.document.columnCount).toBe(0);
    expect(emptyResult.diagnostics).toEqual([]);

    const wsResult = parseCsv("   \n\r\n   ");
    expect(wsResult.success).toBe(true);
    expect(wsResult.document.headers).toEqual([]);
    expect(wsResult.document.rows).toEqual([]);
    expect(wsResult.document.rowCount).toBe(0);
  });

  it("11. handles header-only CSV", () => {
    const result = parseCsv("name,age,city");
    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["name", "age", "city"]);
    expect(result.document.rowCount).toBe(0);
    expect(result.document.columnCount).toBe(3);
    expect(result.diagnostics).toEqual([]);

    const resultWithTrailingNewline = parseCsv("name,age,city\n");
    expect(resultWithTrailingNewline.document.headers).toEqual(["name", "age", "city"]);
    expect(resultWithTrailingNewline.document.rowCount).toBe(0);
  });

  it("12. handles empty cells between delimiters", () => {
    const csv = "a,,c\n1,,3";
    const result = parseCsv(csv);

    expect(result.document.headers).toEqual(["a", "", "c"]);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "", "3"]);
  });

  it("13. preserves trailing empty fields without dropping them", () => {
    const csv = "a,b,c\n1,2,";
    const result = parseCsv(csv);

    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "2", ""]);
    expect(getRow(result.document.rows, 0).fields.length).toBe(3);
  });

  it("14. preserves rows with too few fields and reports diagnostic warning", () => {
    const csv = "a,b,c\n1,2\n3,4,5";
    const result = parseCsv(csv);

    expect(result.success).toBe(true); // non-fatal warning
    expect(result.document.rowCount).toBe(2);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "2"]);
    expect(getRow(result.document.rows, 1).fields).toEqual(["3", "4", "5"]);

    const warnings = result.diagnostics.filter((d) => d.code === "too_few_fields");
    expect(warnings.length).toBe(1);
    expect(getDiagnostic(warnings, 0).severity).toBe("warning");
    expect(getDiagnostic(warnings, 0).line).toBe(2);
  });

  it("15. preserves rows with too many fields and reports diagnostic warning", () => {
    const csv = "a,b\n1,2,3,4\n5,6";
    const result = parseCsv(csv);

    expect(result.success).toBe(true); // non-fatal warning
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "2", "3", "4"]);
    expect(getRow(result.document.rows, 1).fields).toEqual(["5", "6"]);

    const warnings = result.diagnostics.filter((d) => d.code === "too_many_fields");
    expect(warnings.length).toBe(1);
    expect(getDiagnostic(warnings, 0).severity).toBe("warning");
    expect(getDiagnostic(warnings, 0).line).toBe(2);
  });

  it("16. preserves duplicate headers and reports diagnostic warning", () => {
    const csv = "id,name,name\n1,Sam,Samuel";
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["id", "name", "name"]);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "Sam", "Samuel"]);

    const dupWarnings = result.diagnostics.filter((d) => d.code === "duplicate_header");
    expect(dupWarnings.length).toBe(1);
    expect(getDiagnostic(dupWarnings, 0).severity).toBe("warning");
    expect(getDiagnostic(dupWarnings, 0).column).toBe(3);
  });

  it("17. preserves empty headers and reports diagnostic warning", () => {
    const csv = "id,,email\n1,val,test@example.com";
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["id", "", "email"]);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "val", "test@example.com"]);

    const emptyWarnings = result.diagnostics.filter((d) => d.code === "empty_header");
    expect(emptyWarnings.length).toBe(1);
    expect(getDiagnostic(emptyWarnings, 0).severity).toBe("warning");
    expect(getDiagnostic(emptyWarnings, 0).column).toBe(2);
  });

  it("18. reports unterminated quote as structured diagnostic error without throwing", () => {
    const csv = 'id,notes\n1,"unterminated field content';
    const result = parseCsv(csv);

    expect(result.success).toBe(false);
    expect(result.document.rowCount).toBe(1);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "unterminated field content"]);

    const errors = result.diagnostics.filter((d) => d.code === "unterminated_quote");
    expect(errors.length).toBe(1);
    expect(getDiagnostic(errors, 0).severity).toBe("error");
    expect(getDiagnostic(errors, 0).line).toBe(2);
  });

  it("26. supports Unicode content (CJK, Indic, emojis)", () => {
    const csv = "language,greeting,emoji\n日本語,こんにちは,🇯🇵\nதமிழ்,வணக்கம்,🚀";
    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["language", "greeting", "emoji"]);
    expect(getRow(result.document.rows, 0).fields).toEqual(["日本語", "こんにちは", "🇯🇵"]);
    expect(getRow(result.document.rows, 1).fields).toEqual(["தமிழ்", "வணக்கம்", "🚀"]);
  });

  it("supports header: false option", () => {
    const csv = "1,2,3\n4,5,6";
    const result = parseCsv(csv, { header: false });

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual([]);
    expect(result.document.rowCount).toBe(2);
    expect(getRow(result.document.rows, 0).fields).toEqual(["1", "2", "3"]);
    expect(getRow(result.document.rows, 0).index).toBe(0);
    expect(getRow(result.document.rows, 0).lineNumber).toBe(1);
  });

  it("supports skipEmptyLines: true (default) and skipEmptyLines: false", () => {
    const csv = "a,b\n\n1,2\n\n3,4\n\n";

    const defaultResult = parseCsv(csv);
    expect(defaultResult.document.rowCount).toBe(2);

    const noSkipResult = parseCsv(csv, { skipEmptyLines: false });
    // Header on line 1, blank lines on 2, 4, 6, plus data on 3 and 5 -> 5 data rows
    expect(noSkipResult.document.rowCount).toBe(5);
  });

  it("supports trimWhitespace option for unquoted fields", () => {
    const csv = 'a,b,c\n  hello  ," preserved ", 42 ';
    const trimmedResult = parseCsv(csv, { trimWhitespace: true });

    expect(getRow(trimmedResult.document.rows, 0).fields).toEqual(["hello", " preserved ", "42"]);

    const untrimmedResult = parseCsv(csv, { trimWhitespace: false });
    expect(getRow(untrimmedResult.document.rows, 0).fields).toEqual([
      "  hello  ",
      " preserved ",
      " 42 ",
    ]);
  });

  it("handles unexpected quote in unquoted field gracefully", () => {
    const csv = 'a,b\nfoo,bar"baz';
    const result = parseCsv(csv);

    expect(getRow(result.document.rows, 0).fields).toEqual(["foo", 'bar"baz']);
    const quotes = result.diagnostics.filter((d) => d.code === "unexpected_quote");
    expect(quotes.length).toBe(1);
  });

  it("safely strips UTF-8 BOM from beginning of input", () => {
    const csvWithBom = "\uFEFFname,age\nSam,24";
    const result = parseCsv(csvWithBom);

    expect(result.success).toBe(true);
    expect(result.document.headers).toEqual(["name", "age"]);
    expect(getRow(result.document.rows, 0).fields).toEqual(["Sam", "24"]);
  });
});
