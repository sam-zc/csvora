import type { ColumnType } from "@csvora/schemas";

/**
 * Basic pure cell formatting utility based on column type.
 */
export function formatCellValue(value: unknown, type: ColumnType): string {
  if (value === null || value === undefined) {
    return "";
  }

  switch (type) {
    case "string":
      return String(value);
    case "number":
      if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "";
      }
      return String(value);
    case "boolean":
      return value ? "true" : "false";
    case "date":
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);
    default: {
      const _exhaustiveCheck: never = type;
      return String(_exhaustiveCheck);
    }
  }
}
