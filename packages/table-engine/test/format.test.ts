import { describe, expect, it } from "bun:test";
import type { ColumnPresentation, PresentationConfig } from "@csvora/schemas";
import { formatPresentationValue, setColumnFormat, resetColumnPresentation } from "../src";

describe("@csvora/table-engine Semantic Formatting Engine", () => {
  const baseColumn: ColumnPresentation = {
    id: "col_0",
    sourceIndex: 0,
    header: "revenue",
    visible: true,
    align: "right",
    inferredType: "number",
    conditionalRules: [],
  };

  describe("currency formatting", () => {
    it("formats integer revenue as INR with en-IN locale", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "currency",
          options: {
            currency: "INR",
            locale: "en-IN",
          },
        },
      };

      const formatted = formatPresentationValue("1250000", col);
      expect(formatted).toBe("₹12,50,000");
    });

    it("formats USD with decimals when fraction digits specified", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "currency",
          options: {
            currency: "USD",
            locale: "en-US",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        },
      };

      const formatted = formatPresentationValue("1250.5", col);
      expect(formatted).toBe("$1,250.50");
    });

    it("falls back gracefully to raw string when currency cell is non-numeric", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "currency",
          options: {
            currency: "INR",
            locale: "en-IN",
          },
        },
      };

      const formatted = formatPresentationValue("N/A", col);
      expect(formatted).toBe("N/A");
    });
  });

  describe("number formatting", () => {
    it("formats number with locale and thousands separators", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "number",
          options: {
            locale: "en-US",
          },
        },
      };

      expect(formatPresentationValue("1000000", col)).toBe("1,000,000");
    });

    it("supports prefix and suffix for numbers", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "number",
          prefix: "~",
          suffix: " units",
          options: {
            locale: "en-US",
          },
        },
      };

      expect(formatPresentationValue("500", col)).toBe("~500 units");
    });
  });

  describe("percentage formatting", () => {
    it("formats fraction as percentage", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "percent",
          options: {
            locale: "en-US",
          },
        },
      };

      expect(formatPresentationValue("0.15", col)).toBe("15%");
    });

    it("supports whole percentage basis", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "percent",
          options: {
            locale: "en-US",
            basis: "percentage",
          },
        },
      };

      expect(formatPresentationValue("75", col)).toBe("75%");
    });
  });

  describe("date formatting", () => {
    it("formats valid ISO date string with locale", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "date",
          options: {
            locale: "en-US",
            dateStyle: "medium",
          },
        },
      };

      const formatted = formatPresentationValue("2026-10-10T00:00:00.000Z", col);
      expect(formatted).toContain("2026");
    });

    it("falls back to raw value for invalid date string", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "date",
          options: {
            locale: "en-US",
          },
        },
      };

      expect(formatPresentationValue("not-a-date", col)).toBe("not-a-date");
    });
  });

  describe("boolean formatting", () => {
    it("formats boolean with custom true/false labels", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "boolean",
          options: {
            trueLabel: "Yes",
            falseLabel: "No",
          },
        },
      };

      expect(formatPresentationValue("true", col)).toBe("Yes");
      expect(formatPresentationValue("false", col)).toBe("No");
    });
  });

  describe("prefix and suffix", () => {
    it("applies prefix and suffix to text formatting", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "text",
          prefix: "ID-",
          suffix: " [verified]",
        },
      };

      expect(formatPresentationValue("994", col)).toBe("ID-994 [verified]");
    });
  });

  describe("empty and undefined values", () => {
    it("returns empty string for empty cell without prefix/suffix", () => {
      const col: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "currency",
          prefix: "$",
          options: { currency: "USD" },
        },
      };

      expect(formatPresentationValue("", col)).toBe("");
      expect(formatPresentationValue(undefined, col)).toBe("");
    });
  });

  describe("presentation state integration", () => {
    it("updates column format immutably with setColumnFormat", () => {
      const presentation: PresentationConfig = {
        rendererId: "table",
        columns: [baseColumn],
        rendererConfigs: {},
      };

      const updated = setColumnFormat(presentation, "col_0", {
        kind: "currency",
        options: { currency: "INR", locale: "en-IN" },
      });

      expect(updated.columns[0]?.format?.kind).toBe("currency");
      expect(presentation.columns[0]?.format).toBeUndefined();
    });

    it("resets column format on resetColumnPresentation", () => {
      const colWithFormat: ColumnPresentation = {
        ...baseColumn,
        format: {
          kind: "currency",
          options: { currency: "INR", locale: "en-IN" },
        },
      };

      const presentation: PresentationConfig = {
        rendererId: "table",
        columns: [colWithFormat],
        rendererConfigs: {},
      };

      const reset = resetColumnPresentation(presentation, "col_0");
      expect(reset.columns[0]?.format).toBeUndefined();
    });
  });
});
