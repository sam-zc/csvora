import { describe, expect, it } from "bun:test";
import { detectDelimiter } from "../src/delimiter";

describe("detectDelimiter", () => {
  it("detects comma delimiter in standard CSV", () => {
    expect(detectDelimiter("name,age,city\nJohn,25,NYC\nJane,30,LA")).toBe(",");
  });

  it("detects semicolon delimiter in European CSV", () => {
    expect(detectDelimiter("name;age;city\nJohn;25;NYC\nJane;30;LA")).toBe(";");
  });

  it("detects tab delimiter in TSV", () => {
    expect(detectDelimiter("name\tage\tcity\nJohn\t25\tNYC\nJane\t30\tLA")).toBe("\t");
  });

  it("detects pipe delimiter", () => {
    expect(detectDelimiter("name|age|city\nJohn|25|NYC\nJane|30|LA")).toBe("|");
  });

  it("ignores candidate delimiter characters inside quoted cells", () => {
    // Comma CSV with quoted semicolons and pipes
    const sampleComma =
      'name,"desc;with;semicolons|and|pipes",count\nitem1,"foo;bar|baz",10\nitem2,"a;b;c|d",20';
    expect(detectDelimiter(sampleComma)).toBe(",");

    // Semicolon CSV with quoted commas
    const sampleSemicolon =
      'name;description;notes\nCSVora;"CSV, but beautiful, really";"fast, clean"\nOther;"another, one";"test"';
    expect(detectDelimiter(sampleSemicolon)).toBe(";");
  });

  it("handles escaped quotes properly while detecting delimiters", () => {
    const sample = 'id,quote,author\n1,"He said ""hello;world!""",Mark\n2,"Normal text",Alice';
    expect(detectDelimiter(sample)).toBe(",");
  });

  it("handles multiline quoted values in sample", () => {
    const sample = 'id,notes\n1,"line one\nline two"\n2,"line three"';
    expect(detectDelimiter(sample)).toBe(",");
  });

  it("defaults to comma for empty string or whitespace-only", () => {
    expect(detectDelimiter("")).toBe(",");
    expect(detectDelimiter("   \n\r\n  ")).toBe(",");
  });

  it("defaults to comma when no supported delimiters are found", () => {
    expect(detectDelimiter("SingleColumnContent\nAnotherRow")).toBe(",");
  });

  it("works with CRLF and LF line endings", () => {
    expect(detectDelimiter("a;b;c\r\n1;2;3\r\n4;5;6")).toBe(";");
    expect(detectDelimiter("a,b,c\r\n1,2,3\r\n4,5,6")).toBe(",");
  });
});
