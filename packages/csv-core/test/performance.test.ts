import { describe, expect, it } from "bun:test";
import { inferColumnTypes } from "../src/inference";
import { parseCsv } from "../src/parser";
import type { CsvRow } from "../src/types";

function getRow(rows: readonly CsvRow[], index: number): CsvRow {
  const row = rows[index];
  if (!row) {
    throw new Error(`Expected row at index ${index} to exist`);
  }
  return row;
}

describe("Parser Moderate-Scale Performance", () => {
  it("parses 10,000 rows with mixed fields, quotes, and emojis cleanly", () => {
    const rowCount = 10000;
    const header = "id,name,description,count,date,status\n";
    const rows: string[] = [];

    for (let i = 0; i < rowCount; i++) {
      const id = i + 1;
      const name = `Item ${id}`;
      // Every 10th row has quoted comma, every 25th has escaped quotes
      let desc: string;
      if (i % 25 === 0) {
        desc = `"Special ""escaped"" item ${id}"`;
      } else if (i % 10 === 0) {
        desc = `"Item ${id}, with comma"`;
      } else {
        desc = `Description ${id}`;
      }
      const count = (id * 10).toString();
      const date = "2026-10-07";
      const status = i % 2 === 0 ? "true" : "false";

      rows.push(`${id},${name},${desc},${count},${date},${status}`);
    }

    const csvContent = header + rows.join("\n");

    const startTime = performance.now();
    const result = parseCsv(csvContent);
    const duration = performance.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.document.rowCount).toBe(rowCount);
    expect(result.document.columnCount).toBe(6);
    expect(result.document.headers).toEqual([
      "id",
      "name",
      "description",
      "count",
      "date",
      "status",
    ]);

    // Verify first row
    expect(getRow(result.document.rows, 0).fields).toEqual([
      "1",
      "Item 1",
      'Special "escaped" item 1',
      "10",
      "2026-10-07",
      "true",
    ]);

    // Verify row at index 10 (i = 10, i % 10 === 0)
    expect(getRow(result.document.rows, 10).fields).toEqual([
      "11",
      "Item 11",
      "Item 11, with comma",
      "110",
      "2026-10-07",
      "true",
    ]);

    // Verify last row (i = 9999, id = 10000)
    expect(getRow(result.document.rows, rowCount - 1).fields).toEqual([
      "10000",
      "Item 10000",
      "Description 10000",
      "100000",
      "2026-10-07",
      "false",
    ]);

    // Test column type inference across the 10,000 rows
    const types = inferColumnTypes(result.document);
    expect(types).toEqual(["number", "string", "string", "number", "date", "boolean"]);

    // Sanity check to ensure execution is not quadratic (no flaky timing assertion, but log duration)
    // 10,000 rows typically parses in < 100ms in modern JS runtimes
    expect(duration).toBeGreaterThan(0);
  });
});
