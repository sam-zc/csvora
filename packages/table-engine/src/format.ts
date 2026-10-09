import type { ColumnPresentation, ColumnType } from "@csvora/schemas";

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

/**
 * Formats a raw cell string value semantically according to a column's presentation configuration.
 *
 * Rules:
 * - Empty string or undefined returns empty string ("").
 * - If column has an explicit `format` configuration:
 *   - "currency": Formats numbers using Intl.NumberFormat with currency style. If non-numeric,
 *     falls back gracefully to raw string value.
 *   - "number": Formats numbers using Intl.NumberFormat with decimal style and grouping.
 *     If non-numeric, falls back gracefully to raw string value.
 *   - "percent": Formats numbers using Intl.NumberFormat with percent style.
 *     If non-numeric, falls back gracefully to raw string value.
 *   - "date": Parses and formats dates using Intl.DateTimeFormat. If invalid, falls back to raw value.
 *   - "boolean": Formats boolean strings into configured trueLabel/falseLabel.
 *   - "text": Applies optional case transforms (uppercase, lowercase, capitalize).
 *   - Applies optional prefix and suffix to successfully formatted values or fallbacks.
 * - If column has no explicit `format`:
 *   - Formats based on effective column type (typeOverride ?? inferredType).
 * - Never throws on malformed or unexpected data; always falls back to raw string.
 */
export function formatPresentationValue(
  rawValue: string | undefined,
  column: ColumnPresentation,
): string {
  if (rawValue === undefined || rawValue === "") {
    return "";
  }

  const format = column.format;

  if (format) {
    let formattedText: string;

    switch (format.kind) {
      case "currency": {
        const trimmed = rawValue.trim();
        const num = Number(trimmed);
        if (Number.isNaN(num) || trimmed === "") {
          formattedText = rawValue;
        } else {
          const opts = format.options;
          const isInteger = Number.isInteger(num) && !trimmed.includes(".");
          const defaultMaxFrac = isInteger ? 0 : 2;
          const formatter = new Intl.NumberFormat(opts.locale, {
            style: "currency",
            currency: opts.currency,
            minimumFractionDigits: opts.minimumFractionDigits,
            maximumFractionDigits:
              opts.maximumFractionDigits ??
              (opts.minimumFractionDigits !== undefined ? undefined : defaultMaxFrac),
            currencyDisplay: opts.display,
          });
          formattedText = formatter.format(num);
        }
        break;
      }

      case "number": {
        const trimmed = rawValue.trim();
        const num = Number(trimmed);
        if (Number.isNaN(num) || trimmed === "") {
          formattedText = rawValue;
        } else {
          const opts = format.options;
          const formatter = new Intl.NumberFormat(opts?.locale, {
            minimumFractionDigits: opts?.minimumFractionDigits,
            maximumFractionDigits: opts?.maximumFractionDigits,
            useGrouping: opts?.useGrouping,
          });
          formattedText = formatter.format(num);
        }
        break;
      }

      case "percent": {
        const trimmed = rawValue.trim();
        const rawNum = Number(trimmed);
        if (Number.isNaN(rawNum) || trimmed === "") {
          formattedText = rawValue;
        } else {
          const opts = format.options;
          const num = opts?.basis === "percentage" ? rawNum / 100 : rawNum;
          const formatter = new Intl.NumberFormat(opts?.locale, {
            style: "percent",
            minimumFractionDigits: opts?.minimumFractionDigits,
            maximumFractionDigits: opts?.maximumFractionDigits,
          });
          formattedText = formatter.format(num);
        }
        break;
      }

      case "date": {
        const trimmed = rawValue.trim();
        const date = new Date(trimmed);
        if (Number.isNaN(date.getTime()) || trimmed === "") {
          formattedText = rawValue;
        } else {
          const opts = format.options;
          const formatter = new Intl.DateTimeFormat(opts?.locale, {
            dateStyle: opts?.dateStyle ?? "medium",
            timeStyle: opts?.timeStyle,
          });
          formattedText = formatter.format(date);
        }
        break;
      }

      case "boolean": {
        const lower = rawValue.trim().toLowerCase();
        const opts = format.options;
        const trueLabel = opts?.trueLabel ?? "true";
        const falseLabel = opts?.falseLabel ?? "false";

        if (lower === "true" || lower === "1" || lower === "yes") {
          formattedText = trueLabel;
        } else if (lower === "false" || lower === "0" || lower === "no") {
          formattedText = falseLabel;
        } else {
          formattedText = rawValue;
        }
        break;
      }

      case "text": {
        const opts = format.options;
        if (opts?.transform === "uppercase") {
          formattedText = rawValue.toUpperCase();
        } else if (opts?.transform === "lowercase") {
          formattedText = rawValue.toLowerCase();
        } else if (opts?.transform === "capitalize") {
          formattedText =
            rawValue.length > 0 ? (rawValue[0]?.toUpperCase() ?? "") + rawValue.slice(1) : "";
        } else {
          formattedText = rawValue;
        }
        break;
      }

      default: {
        const _exhaustive: never = format;
        formattedText = String(_exhaustive);
      }
    }

    const prefix = format.prefix ?? "";
    const suffix = format.suffix ?? "";
    return `${prefix}${formattedText}${suffix}`;
  }

  // Fallback to type-based formatting when no explicit format is set
  const effectiveType = column.typeOverride ?? column.inferredType;
  return formatCellValue(rawValue, effectiveType);
}
