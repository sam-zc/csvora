import { describe, expect, it } from "bun:test";
import { inferCellType, inferColumnType, inferColumnTypes } from "../src/inference";
import type { CsvDocument } from "../src/types";

describe("Type Inference", () => {
  describe("inferCellType", () => {
    it("infers boolean for true / false case-insensitively", () => {
      expect(inferCellType("true")).toBe("boolean");
      expect(inferCellType("false")).toBe("boolean");
      expect(inferCellType("TRUE")).toBe("boolean");
      expect(inferCellType("FALSE")).toBe("boolean");
      expect(inferCellType("True")).toBe("boolean");
      expect(inferCellType("False")).toBe("boolean");
    });

    it("does not infer boolean for yes/no or 1/0", () => {
      expect(inferCellType("yes")).toBe("string");
      expect(inferCellType("no")).toBe("string");
      expect(inferCellType("1")).toBe("number");
      expect(inferCellType("0")).toBe("number");
    });

    it("infers number for integers and decimals", () => {
      expect(inferCellType("42")).toBe("number");
      expect(inferCellType("-42")).toBe("number");
      expect(inferCellType("+42")).toBe("number");
      expect(inferCellType("0")).toBe("number");
      expect(inferCellType("3.14")).toBe("number");
      expect(inferCellType("-0.5")).toBe("number");
      expect(inferCellType("1e10")).toBe("number");
      expect(inferCellType("2.5E-3")).toBe("number");
    });

    it("conservatively treats leading-zero numbers as string", () => {
      expect(inferCellType("00123")).toBe("string");
      expect(inferCellType("0123")).toBe("string");
      expect(inferCellType("000")).toBe("string");
      expect(inferCellType("01")).toBe("string");
    });

    it("infers date for unambiguous ISO-8601 strings", () => {
      expect(inferCellType("2026-10-07")).toBe("date");
      expect(inferCellType("2024-02-29")).toBe("date"); // leap year
      expect(inferCellType("2026-10-07T14:30:00Z")).toBe("date");
      expect(inferCellType("2026-10-07T14:30:00+05:30")).toBe("date");
      expect(inferCellType("2026-10-07 14:30:00")).toBe("date");
    });

    it("treats ambiguous dates or invalid dates as string", () => {
      expect(inferCellType("01/02/03")).toBe("string");
      expect(inferCellType("10/07/2026")).toBe("string");
      expect(inferCellType("2026-02-30")).toBe("string"); // invalid day
      expect(inferCellType("2026-13-01")).toBe("string"); // invalid month
      expect(inferCellType("October 7, 2026")).toBe("string");
    });

    it("treats plain text, N/A, and empty strings as string", () => {
      expect(inferCellType("hello")).toBe("string");
      expect(inferCellType("N/A")).toBe("string");
      expect(inferCellType("")).toBe("string");
      expect(inferCellType("   ")).toBe("string");
    });
  });

  describe("inferColumnType", () => {
    it("infers homogeneous column types", () => {
      expect(inferColumnType(["10", "20", "30"])).toBe("number");
      expect(inferColumnType(["true", "false", "TRUE"])).toBe("boolean");
      expect(inferColumnType(["2026-01-01", "2026-01-02"])).toBe("date");
      expect(inferColumnType(["alpha", "beta", "gamma"])).toBe("string");
    });

    it("skips empty cells when determining column type", () => {
      expect(inferColumnType(["10", "", "30", "   "])).toBe("number");
      expect(inferColumnType(["", "true", "false"])).toBe("boolean");
      expect(inferColumnType(["2026-01-01", ""])).toBe("date");
    });

    it("defaults to string when all cells in column are empty", () => {
      expect(inferColumnType([])).toBe("string");
      expect(inferColumnType(["", "   ", ""])).toBe("string");
    });

    it("falls back to string when column contains mixed types", () => {
      expect(inferColumnType(["42", "not a number", "50"])).toBe("string");
      expect(inferColumnType(["true", "2026-01-01"])).toBe("string");
      expect(inferColumnType(["123", "00123"])).toBe("string");
    });
  });

  describe("inferColumnTypes for document", () => {
    it("infers types for each column in a CsvDocument", () => {
      const doc: CsvDocument = {
        headers: ["id", "active", "date", "notes"],
        rows: [
          { index: 0, lineNumber: 2, fields: ["1", "true", "2026-10-07", "First"] },
          { index: 1, lineNumber: 3, fields: ["2", "false", "2026-10-08", "Second"] },
          { index: 2, lineNumber: 4, fields: ["3", "true", "", "Third"] },
        ],
        delimiter: ",",
        rowCount: 3,
        columnCount: 4,
      };

      const types = inferColumnTypes(doc);
      expect(types).toEqual(["number", "boolean", "date", "string"]);
    });

    it("returns empty array for document with 0 columns", () => {
      const doc: CsvDocument = {
        headers: [],
        rows: [],
        delimiter: ",",
        rowCount: 0,
        columnCount: 0,
      };
      expect(inferColumnTypes(doc)).toEqual([]);
    });
  });
});
