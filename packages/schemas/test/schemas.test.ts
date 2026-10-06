import { describe, expect, it } from "bun:test";
import { healthResponseSchema, tableConfigSchema } from "../src";

describe("@csvora/schemas", () => {
  it("validates health response", () => {
    const valid = healthResponseSchema.parse({ status: "ok" });
    expect(valid.status).toBe("ok");
    expect(() => healthResponseSchema.parse({ status: "error" })).toThrow();
  });

  it("validates table config", () => {
    const table = tableConfigSchema.parse({
      id: "table_1",
      name: "Sample Table",
      columns: [
        { id: "col_1", name: "First Name", type: "string" },
        { id: "col_2", name: "Age", type: "number" },
      ],
    });
    expect(table.id).toBe("table_1");
    expect(table.columns).toHaveLength(2);
    expect(table.columns[0]?.type).toBe("string");
    expect(table.columns[1]?.type).toBe("number");
  });

  it("rejects invalid table config", () => {
    expect(() =>
      tableConfigSchema.parse({
        id: "",
        name: "Invalid",
      }),
    ).toThrow();
  });
});
