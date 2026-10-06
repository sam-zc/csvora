import { describe, expect, it } from "bun:test";
import { createDefaultTableConfig, formatCellValue } from "../src";

describe("@csvora/table-engine", () => {
  it("creates a default table config", () => {
    const config = createDefaultTableConfig({
      id: "tbl-1",
      name: "Users",
      columns: [{ id: "c1", name: "Email" }],
    });

    expect(config.id).toBe("tbl-1");
    expect(config.name).toBe("Users");
    expect(config.columns).toHaveLength(1);
    expect(config.columns[0]?.type).toBe("string");
  });

  it("handles missing columns gracefully", () => {
    const config = createDefaultTableConfig({
      id: "tbl-empty",
      name: "Empty Table",
    });

    expect(config.columns).toHaveLength(0);
  });

  it("formats string values", () => {
    expect(formatCellValue("hello", "string")).toBe("hello");
  });

  it("formats number values", () => {
    expect(formatCellValue(42, "number")).toBe("42");
    expect(formatCellValue(Number.NaN, "number")).toBe("");
  });

  it("formats boolean values", () => {
    expect(formatCellValue(true, "boolean")).toBe("true");
    expect(formatCellValue(false, "boolean")).toBe("false");
  });

  it("formats null and undefined as empty strings", () => {
    expect(formatCellValue(null, "string")).toBe("");
    expect(formatCellValue(undefined, "number")).toBe("");
  });

  it("formats Date objects", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(formatCellValue(date, "date")).toBe("2026-01-01T00:00:00.000Z");
  });
});
