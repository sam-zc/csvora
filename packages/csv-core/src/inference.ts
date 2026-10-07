import type { CsvColumnType, CsvDocument } from "./types";

const STRICT_NUMBER_REGEX = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const ISO_DATE_ONLY_REGEX = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ISO_DATETIME_REGEX =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)?$/;

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

/**
 * Conservatively infers the semantic type of a single string cell value.
 *
 * Rules:
 * - Empty string or whitespace-only -> "string"
 * - Case-insensitive "true" | "false" -> "boolean"
 * - Standard decimal/integer numbers without leading zeros -> "number"
 *   (e.g., "42", "3.14", "1e10", "-5"; but "00123" -> "string")
 * - Unambiguous ISO-8601 calendar dates/datetimes -> "date"
 * - All other formats (text, ambiguous dates, codes) -> "string"
 */
export function inferCellType(value: string): CsvColumnType {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "string";
  }

  const lower = trimmed.toLowerCase();
  if (lower === "true" || lower === "false") {
    return "boolean";
  }

  if (STRICT_NUMBER_REGEX.test(trimmed)) {
    return "number";
  }

  const dateOnlyMatch = ISO_DATE_ONLY_REGEX.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (isValidCalendarDate(year, month, day)) {
      return "date";
    }
    return "string";
  }

  const dateTimeMatch = ISO_DATETIME_REGEX.exec(trimmed);
  if (dateTimeMatch) {
    const year = Number(dateTimeMatch[1]);
    const month = Number(dateTimeMatch[2]);
    const day = Number(dateTimeMatch[3]);
    if (isValidCalendarDate(year, month, day)) {
      return "date";
    }
    return "string";
  }

  return "string";
}

/**
 * Conservatively infers the semantic type for a collection of cell values belonging to a column.
 *
 * - Empty or whitespace-only cells are skipped.
 * - If all non-empty values share the same inferred type, that type is returned.
 * - If any conflicting types are present, falls back safely to "string".
 * - If all values are empty, returns "string".
 */
export function inferColumnType(values: readonly string[]): CsvColumnType {
  let inferred: CsvColumnType | null = null;

  for (const rawValue of values) {
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const cellType = inferCellType(trimmed);
    if (inferred === null) {
      inferred = cellType;
    } else if (inferred !== cellType) {
      return "string";
    }
  }

  return inferred ?? "string";
}

/**
 * Infers column types for every column in a CsvDocument.
 *
 * Returns an array of CsvColumnType corresponding to the document's columns in order.
 */
export function inferColumnTypes(document: CsvDocument): readonly CsvColumnType[] {
  const columnCount = document.columnCount;
  if (columnCount === 0) {
    return [];
  }

  const result: CsvColumnType[] = [];

  for (let col = 0; col < columnCount; col++) {
    const columnValues: string[] = [];
    for (const row of document.rows) {
      if (col < row.fields.length) {
        columnValues.push(row.fields[col] ?? "");
      }
    }
    result.push(inferColumnType(columnValues));
  }

  return result;
}
