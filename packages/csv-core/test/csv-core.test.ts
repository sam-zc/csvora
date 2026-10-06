import { describe, expect, it } from "bun:test";
import { detectDelimiter, normalizeLineEndings, splitCsvLines } from "../src";

describe("@csvora/csv-core", () => {
  it("normalizes CRLF and CR line endings", () => {
    const raw = "col1,col2\r\nval1,val2\rval3,val4\nval5,val6";
    const normalized = normalizeLineEndings(raw);
    expect(normalized).toBe("col1,col2\nval1,val2\nval3,val4\nval5,val6");
  });

  it("splits csv lines correctly", () => {
    const raw = "a,b\r\n1,2\r\n3,4\n";
    expect(splitCsvLines(raw)).toEqual(["a,b", "1,2", "3,4"]);
  });

  it("handles empty string gracefully", () => {
    expect(splitCsvLines("")).toEqual([]);
  });

  it("detects comma delimiter", () => {
    expect(detectDelimiter("name,age,city\nJohn,25,NYC")).toBe(",");
  });

  it("detects semicolon delimiter", () => {
    expect(detectDelimiter("name;age;city\nJohn;25;NYC")).toBe(";");
  });

  it("detects tab delimiter", () => {
    expect(detectDelimiter("name\tage\tcity\nJohn\t25\tNYC")).toBe("\t");
  });

  it("detects pipe delimiter", () => {
    expect(detectDelimiter("name|age|city\nJohn|25|NYC")).toBe("|");
  });

  it("defaults to comma for empty string", () => {
    expect(detectDelimiter("")).toBe(",");
  });
});
