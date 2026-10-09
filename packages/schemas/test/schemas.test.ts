import { describe, expect, it } from "bun:test";
import {
  columnPresentationSchema,
  columnWidthSchema,
  departuresConfigSchema,
  healthResponseSchema,
  presentationConfigSchema,
  rendererIdSchema,
  tableConfigSchema,
} from "../src";

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

  it("validates renderer id", () => {
    expect(rendererIdSchema.parse("table")).toBe("table");
    expect(rendererIdSchema.parse("departures")).toBe("departures");
    expect(() => rendererIdSchema.parse("unknown_renderer")).toThrow();
    expect(() => rendererIdSchema.parse("periodic")).toThrow();
  });

  it("validates departures configuration schema", () => {
    const config = departuresConfigSchema.parse({
      timeColumnId: "col_0",
      flightColumnId: "col_1",
      destinationColumnId: "col_2",
      gateColumnId: "col_3",
      statusColumnId: "col_4",
    });
    expect(config.timeColumnId).toBe("col_0");
    expect(config.statusColumnId).toBe("col_4");

    const partialConfig = departuresConfigSchema.parse({
      timeColumnId: "col_0",
    });
    expect(partialConfig.timeColumnId).toBe("col_0");
    expect(partialConfig.flightColumnId).toBeUndefined();
  });

  it("validates column presentation configuration", () => {
    const col = columnPresentationSchema.parse({
      id: "col_0",
      sourceIndex: 0,
      header: "User Name",
    });
    expect(col.id).toBe("col_0");
    expect(col.sourceIndex).toBe(0);
    expect(col.header).toBe("User Name");
    expect(col.visible).toBe(true);
    expect(col.inferredType).toBe("string");
    expect(col.typeOverride).toBeUndefined();

    const typedCol = columnPresentationSchema.parse({
      id: "col_1",
      sourceIndex: 1,
      header: "Amount",
      visible: false,
      align: "right",
      inferredType: "number",
      typeOverride: "string",
      width: 150,
    });
    expect(typedCol.align).toBe("right");
    expect(typedCol.visible).toBe(false);
    expect(typedCol.inferredType).toBe("number");
    expect(typedCol.typeOverride).toBe("string");
    expect(typedCol.width).toBe(150);

    expect(() =>
      columnPresentationSchema.parse({
        id: "col_2",
        sourceIndex: 2,
        header: "Bad",
        inferredType: "invalid_type",
      }),
    ).toThrow();
  });

  it("validates column width schema bounds and constraints", () => {
    expect(columnWidthSchema.parse(80)).toBe(80);
    expect(columnWidthSchema.parse(600)).toBe(600);
    expect(columnWidthSchema.parse(250)).toBe(250);

    // Below minimum (80)
    expect(() => columnWidthSchema.parse(79)).toThrow();
    // Above maximum (600)
    expect(() => columnWidthSchema.parse(601)).toThrow();
    // Non-integer
    expect(() => columnWidthSchema.parse(150.5)).toThrow();
    // Negative or zero
    expect(() => columnWidthSchema.parse(0)).toThrow();
    expect(() => columnWidthSchema.parse(-100)).toThrow();
  });

  it("validates presentation config", () => {
    const presentation = presentationConfigSchema.parse({
      rendererId: "table",
      columns: [
        { id: "col_0", sourceIndex: 0, header: "Title", visible: true, align: "left" },
        { id: "col_1", sourceIndex: 1, header: "Score", visible: true, align: "right" },
      ],
      rendererConfigs: {
        departures: {
          timeColumnId: "col_0",
          flightColumnId: "col_1",
        },
      },
    });
    expect(presentation.rendererId).toBe("table");
    expect(presentation.columns).toHaveLength(2);
    expect(presentation.rendererConfigs.departures?.timeColumnId).toBe("col_0");
  });
});
