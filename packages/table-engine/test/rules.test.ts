import { describe, expect, it } from "bun:test";
import type { CsvDocument } from "@csvora/csv-core";
import type { ColumnPresentation, ConditionalRule } from "@csvora/schemas";
import {
  addConditionalRule,
  clearConditionalRules,
  createDefaultPresentation,
  evaluateConditionalRule,
  getOperatorsForType,
  moveConditionalRule,
  removeConditionalRule,
  resetColumnPresentation,
  resetLayout,
  resolveConditionalIntent,
  updateConditionalRule,
  validateConditionalRule,
} from "../src";

describe("@csvora/table-engine Conditional Formatting & Semantic Rules", () => {
  const numCol: ColumnPresentation = {
    id: "col_revenue",
    sourceIndex: 0,
    header: "Revenue",
    visible: true,
    align: "right",
    inferredType: "number",
    conditionalRules: [],
  };

  const strCol: ColumnPresentation = {
    id: "col_status",
    sourceIndex: 1,
    header: "Status",
    visible: true,
    align: "left",
    inferredType: "string",
    conditionalRules: [],
  };

  const boolCol: ColumnPresentation = {
    id: "col_active",
    sourceIndex: 2,
    header: "Active",
    visible: true,
    align: "left",
    inferredType: "boolean",
    conditionalRules: [],
  };

  const dateCol: ColumnPresentation = {
    id: "col_due",
    sourceIndex: 3,
    header: "DueDate",
    visible: true,
    align: "left",
    inferredType: "date",
    conditionalRules: [],
  };

  describe("Numeric operator evaluation", () => {
    it("evaluates greater than (gt)", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "gt",
        value: 100,
        intent: "success",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "150", "number")).toBe(true);
      expect(evaluateConditionalRule(rule, "100", "number")).toBe(false);
      expect(evaluateConditionalRule(rule, "50", "number")).toBe(false);
    });

    it("evaluates greater than or equal (gte)", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "gte",
        value: 100,
        intent: "success",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "100", "number")).toBe(true);
      expect(evaluateConditionalRule(rule, "100.1", "number")).toBe(true);
      expect(evaluateConditionalRule(rule, "99.9", "number")).toBe(false);
    });

    it("evaluates less than (lt)", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "lt",
        value: 0,
        intent: "danger",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "-15000", "number")).toBe(true);
      expect(evaluateConditionalRule(rule, "0", "number")).toBe(false);
      expect(evaluateConditionalRule(rule, "10", "number")).toBe(false);
    });

    it("evaluates less than or equal (lte)", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "lte",
        value: 0,
        intent: "danger",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "0", "number")).toBe(true);
      expect(evaluateConditionalRule(rule, "-0.01", "number")).toBe(true);
      expect(evaluateConditionalRule(rule, "0.01", "number")).toBe(false);
    });

    it("evaluates numeric equals (eq) and not equals (neq)", () => {
      const eqRule: ConditionalRule = {
        id: "r1",
        operator: "eq",
        value: 42,
        intent: "info",
        enabled: true,
      };
      const neqRule: ConditionalRule = {
        id: "r2",
        operator: "neq",
        value: 42,
        intent: "muted",
        enabled: true,
      };

      expect(evaluateConditionalRule(eqRule, "42", "number")).toBe(true);
      expect(evaluateConditionalRule(eqRule, "42.0", "number")).toBe(true);
      expect(evaluateConditionalRule(eqRule, "43", "number")).toBe(false);

      expect(evaluateConditionalRule(neqRule, "43", "number")).toBe(true);
      expect(evaluateConditionalRule(neqRule, "42", "number")).toBe(false);
    });

    it("handles non-numeric raw cell safely without throwing or coercing unexpectedly", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "gt",
        value: 0,
        intent: "success",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "N/A", "number")).toBe(false);
      expect(evaluateConditionalRule(rule, "invalid", "number")).toBe(false);
      expect(evaluateConditionalRule(rule, undefined, "number")).toBe(false);
    });

    it("handles invalid rule comparison value safely", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "gt",
        value: "not-a-number",
        intent: "success",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "50", "number")).toBe(false);
    });
  });

  describe("Text operator evaluation", () => {
    it("evaluates text equals (eq) case-insensitively", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "eq",
        value: "Delayed",
        intent: "warning",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "delayed", "string")).toBe(true);
      expect(evaluateConditionalRule(rule, "DELAYED", "string")).toBe(true);
      expect(evaluateConditionalRule(rule, "On Time", "string")).toBe(false);
    });

    it("evaluates text not equals (neq)", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "neq",
        value: "Active",
        intent: "muted",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "Inactive", "string")).toBe(true);
      expect(evaluateConditionalRule(rule, "active", "string")).toBe(false);
    });

    it("evaluates contains", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "contains",
        value: "test",
        intent: "muted",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "This is a Test run", "string")).toBe(true);
      expect(evaluateConditionalRule(rule, "testing 123", "string")).toBe(true);
      expect(evaluateConditionalRule(rule, "Production", "string")).toBe(false);
    });

    it("evaluates startsWith and endsWith", () => {
      const startRule: ConditionalRule = {
        id: "r1",
        operator: "startsWith",
        value: "ERR",
        intent: "danger",
        enabled: true,
      };
      const endRule: ConditionalRule = {
        id: "r2",
        operator: "endsWith",
        value: "pending",
        intent: "warning",
        enabled: true,
      };

      expect(evaluateConditionalRule(startRule, "err_404_not_found", "string")).toBe(true);
      expect(evaluateConditionalRule(startRule, "warning_err", "string")).toBe(false);

      expect(evaluateConditionalRule(endRule, "approval_pending", "string")).toBe(true);
      expect(evaluateConditionalRule(endRule, "pending_approval", "string")).toBe(false);
    });
  });

  describe("Boolean operator evaluation", () => {
    it("evaluates boolean true and false equality", () => {
      const trueRule: ConditionalRule = {
        id: "r1",
        operator: "eq",
        value: "true",
        intent: "success",
        enabled: true,
      };
      const falseRule: ConditionalRule = {
        id: "r2",
        operator: "eq",
        value: "false",
        intent: "danger",
        enabled: true,
      };

      expect(evaluateConditionalRule(trueRule, "true", "boolean")).toBe(true);
      expect(evaluateConditionalRule(trueRule, "1", "boolean")).toBe(true);
      expect(evaluateConditionalRule(trueRule, "yes", "boolean")).toBe(true);
      expect(evaluateConditionalRule(trueRule, "false", "boolean")).toBe(false);

      expect(evaluateConditionalRule(falseRule, "false", "boolean")).toBe(true);
      expect(evaluateConditionalRule(falseRule, "0", "boolean")).toBe(true);
      expect(evaluateConditionalRule(falseRule, "no", "boolean")).toBe(true);
      expect(evaluateConditionalRule(falseRule, "true", "boolean")).toBe(false);
    });
  });

  describe("Date operator evaluation", () => {
    it("evaluates before and after safely", () => {
      const beforeRule: ConditionalRule = {
        id: "r1",
        operator: "before",
        value: "2026-06-01",
        intent: "warning",
        enabled: true,
      };
      const afterRule: ConditionalRule = {
        id: "r2",
        operator: "after",
        value: "2026-06-01",
        intent: "info",
        enabled: true,
      };

      expect(evaluateConditionalRule(beforeRule, "2026-01-15", "date")).toBe(true);
      expect(evaluateConditionalRule(beforeRule, "2026-07-20", "date")).toBe(false);

      expect(evaluateConditionalRule(afterRule, "2026-07-20", "date")).toBe(true);
      expect(evaluateConditionalRule(afterRule, "2026-01-15", "date")).toBe(false);
    });

    it("handles invalid date strings gracefully without crashing", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "before",
        value: "2026-06-01",
        intent: "warning",
        enabled: true,
      };

      expect(evaluateConditionalRule(rule, "not-a-date", "date")).toBe(false);
    });
  });

  describe("Empty and notEmpty operators across types", () => {
    it("defines empty strictly as raw === '' or undefined", () => {
      const emptyRule: ConditionalRule = {
        id: "r1",
        operator: "empty",
        intent: "muted",
        enabled: true,
      };
      const notEmptyRule: ConditionalRule = {
        id: "r2",
        operator: "notEmpty",
        intent: "info",
        enabled: true,
      };

      expect(evaluateConditionalRule(emptyRule, "", "string")).toBe(true);
      expect(evaluateConditionalRule(emptyRule, undefined, "number")).toBe(true);

      // Does not treat 0, false, " ", or null string as empty
      expect(evaluateConditionalRule(emptyRule, "0", "number")).toBe(false);
      expect(evaluateConditionalRule(emptyRule, "false", "boolean")).toBe(false);
      expect(evaluateConditionalRule(emptyRule, "null", "string")).toBe(false);

      expect(evaluateConditionalRule(notEmptyRule, "0", "number")).toBe(true);
      expect(evaluateConditionalRule(notEmptyRule, "hello", "string")).toBe(true);
      expect(evaluateConditionalRule(notEmptyRule, "", "string")).toBe(false);
      expect(evaluateConditionalRule(notEmptyRule, undefined, "string")).toBe(false);
    });
  });

  describe("Disabled rules", () => {
    it("skips disabled rules regardless of matching condition", () => {
      const rule: ConditionalRule = {
        id: "r1",
        operator: "gt",
        value: 10,
        intent: "success",
        enabled: false,
      };

      expect(evaluateConditionalRule(rule, "50", "number")).toBe(false);
    });
  });

  describe("Rule precedence and resolveConditionalIntent", () => {
    it("evaluates in array order: first matching rule wins", () => {
      const column: ColumnPresentation = {
        ...numCol,
        conditionalRules: [
          { id: "r1", operator: "lt", value: 0, intent: "danger", enabled: true },
          { id: "r2", operator: "gt", value: 100, intent: "success", enabled: true },
          { id: "r3", operator: "gt", value: 10, intent: "warning", enabled: true },
        ],
      };

      // -100 matches r1 (< 0) -> danger
      expect(resolveConditionalIntent({ rawValue: "-100", column })).toBe("danger");

      // 150 matches r2 (> 100) -> success (even though > 10 also true)
      expect(resolveConditionalIntent({ rawValue: "150", column })).toBe("success");

      // 50 matches r3 (> 10) -> warning
      expect(resolveConditionalIntent({ rawValue: "50", column })).toBe("warning");

      // 5 matches none -> undefined
      expect(resolveConditionalIntent({ rawValue: "5", column })).toBeUndefined();
    });

    it("evaluates against raw semantic value, NOT formatted display string", () => {
      const column: ColumnPresentation = {
        ...numCol,
        format: {
          kind: "currency",
          options: { currency: "INR", locale: "en-IN" },
        },
        conditionalRules: [
          { id: "r1", operator: "gt", value: 1000000, intent: "success", enabled: true },
        ],
      };

      // Raw value is 1250000 (which formats to "₹12,50,000")
      // Evaluator must check 1250000 > 1000000 and return success
      expect(resolveConditionalIntent({ rawValue: "1250000", column })).toBe("success");
    });

    it("resolves intent across string, boolean, and date column types", () => {
      const activeStrCol: ColumnPresentation = {
        ...strCol,
        conditionalRules: [
          { id: "s1", operator: "contains", value: "delay", intent: "warning", enabled: true },
        ],
      };
      expect(resolveConditionalIntent({ rawValue: "Delayed by 15m", column: activeStrCol })).toBe(
        "warning",
      );

      const activeBoolCol: ColumnPresentation = {
        ...boolCol,
        conditionalRules: [
          { id: "b1", operator: "eq", value: "false", intent: "danger", enabled: true },
        ],
      };
      expect(resolveConditionalIntent({ rawValue: "0", column: activeBoolCol })).toBe("danger");

      const activeDateCol: ColumnPresentation = {
        ...dateCol,
        conditionalRules: [
          { id: "d1", operator: "before", value: "2026-01-01", intent: "muted", enabled: true },
        ],
      };
      expect(resolveConditionalIntent({ rawValue: "2025-12-01", column: activeDateCol })).toBe(
        "muted",
      );
    });
  });

  describe("Type override resilience", () => {
    it("safely evaluates as non-match when column type becomes incompatible", () => {
      // Rule was set for numeric comparison (> 100)
      const rule: ConditionalRule = {
        id: "r1",
        operator: "gt",
        value: 100,
        intent: "success",
        enabled: true,
      };

      // Column type overridden to string
      expect(evaluateConditionalRule(rule, "200", "string")).toBe(false);
    });
  });

  describe("Presentation state transitions & immutability", () => {
    const baseDoc: CsvDocument = {
      headers: ["Revenue", "Status"],
      rows: [
        { index: 0, lineNumber: 2, fields: ["120000", "Active"] },
        { index: 1, lineNumber: 3, fields: ["-15000", "Delayed"] },
      ],
      columnCount: 2,
      rowCount: 2,
      delimiter: ",",
    };

    it("adds conditional rule immutably to a column", () => {
      const initial = createDefaultPresentation(baseDoc);
      const updated = addConditionalRule(initial, "col_0", {
        operator: "lt",
        value: 0,
        intent: "danger",
      });

      expect(initial.columns[0]?.conditionalRules).toHaveLength(0);
      expect(updated.columns[0]?.conditionalRules).toHaveLength(1);
      expect(updated.columns[0]?.conditionalRules[0]?.operator).toBe("lt");
      expect(updated.columns[0]?.conditionalRules[0]?.intent).toBe("danger");
      expect(updated.columns[0]?.conditionalRules[0]?.id).toBeDefined();
    });

    it("caps conditional rules at maximum limit (20 rules)", () => {
      let pres = createDefaultPresentation(baseDoc);
      for (let i = 0; i < 25; i++) {
        pres = addConditionalRule(pres, "col_0", {
          operator: "gt",
          value: i,
          intent: "info",
        });
      }

      expect(pres.columns[0]?.conditionalRules).toHaveLength(20);
    });

    it("updates conditional rule immutably", () => {
      const initial = createDefaultPresentation(baseDoc);
      const withRule = addConditionalRule(initial, "col_0", {
        id: "custom_rule_1",
        operator: "lt",
        value: 0,
        intent: "danger",
      });

      const updated = updateConditionalRule(withRule, "col_0", "custom_rule_1", {
        intent: "warning",
        value: -500,
      });

      expect(withRule.columns[0]?.conditionalRules[0]?.intent).toBe("danger");
      expect(updated.columns[0]?.conditionalRules[0]?.intent).toBe("warning");
      expect(updated.columns[0]?.conditionalRules[0]?.value).toBe(-500);
    });

    it("removes conditional rule immutably", () => {
      const initial = createDefaultPresentation(baseDoc);
      const withRule = addConditionalRule(initial, "col_0", {
        id: "custom_rule_1",
        operator: "lt",
        value: 0,
        intent: "danger",
      });

      const updated = removeConditionalRule(withRule, "col_0", "custom_rule_1");
      expect(updated.columns[0]?.conditionalRules).toHaveLength(0);
    });

    it("moves conditional rule up and down immutably with boundary safety", () => {
      let pres = createDefaultPresentation(baseDoc);
      pres = addConditionalRule(pres, "col_0", {
        id: "rule_1",
        operator: "gt",
        value: 10,
        intent: "info",
      });
      pres = addConditionalRule(pres, "col_0", {
        id: "rule_2",
        operator: "lt",
        value: 0,
        intent: "danger",
      });
      pres = addConditionalRule(pres, "col_0", {
        id: "rule_3",
        operator: "eq",
        value: 5,
        intent: "warning",
      });

      expect(pres.columns[0]?.conditionalRules.map((r) => r.id)).toEqual([
        "rule_1",
        "rule_2",
        "rule_3",
      ]);

      // Move rule_2 up
      const movedUp = moveConditionalRule(pres, "col_0", "rule_2", "up");
      expect(movedUp.columns[0]?.conditionalRules.map((r) => r.id)).toEqual([
        "rule_2",
        "rule_1",
        "rule_3",
      ]);

      // Moving rule_2 up again when at top is a no-op
      const movedUpAgain = moveConditionalRule(movedUp, "col_0", "rule_2", "up");
      expect(movedUpAgain.columns[0]?.conditionalRules.map((r) => r.id)).toEqual([
        "rule_2",
        "rule_1",
        "rule_3",
      ]);

      // Move rule_1 down
      const movedDown = moveConditionalRule(movedUp, "col_0", "rule_1", "down");
      expect(movedDown.columns[0]?.conditionalRules.map((r) => r.id)).toEqual([
        "rule_2",
        "rule_3",
        "rule_1",
      ]);
    });

    it("clears conditional rules for a specific column", () => {
      let pres = createDefaultPresentation(baseDoc);
      pres = addConditionalRule(pres, "col_0", { operator: "gt", value: 10, intent: "info" });
      expect(pres.columns[0]?.conditionalRules).toHaveLength(1);

      const cleared = clearConditionalRules(pres, "col_0");
      expect(cleared.columns[0]?.conditionalRules).toHaveLength(0);
    });

    it("resetColumnPresentation clears conditional rules", () => {
      let pres = createDefaultPresentation(baseDoc);
      pres = addConditionalRule(pres, "col_0", { operator: "gt", value: 10, intent: "info" });

      const reset = resetColumnPresentation(pres, "col_0");
      expect(reset.columns[0]?.conditionalRules).toHaveLength(0);
    });

    it("resetLayout preserves conditional rules", () => {
      let pres = createDefaultPresentation(baseDoc);
      pres = addConditionalRule(pres, "col_0", { operator: "gt", value: 10, intent: "info" });

      const layoutReset = resetLayout(pres);
      expect(layoutReset.columns[0]?.conditionalRules).toHaveLength(1);
      expect(layoutReset.columns[0]?.conditionalRules[0]?.operator).toBe("gt");
    });

    it("never mutates the input CsvDocument", () => {
      const initial = createDefaultPresentation(baseDoc);
      const updated = addConditionalRule(initial, "col_0", {
        operator: "lt",
        value: 0,
        intent: "danger",
      });

      expect(baseDoc.rows[0]?.fields[0]).toBe("120000");
      expect(baseDoc.rows[1]?.fields[0]).toBe("-15000");
      expect(updated.columns[0]?.conditionalRules).toHaveLength(1);
    });
  });

  describe("Operator metadata & diagnostics", () => {
    it("returns correct operators for number, string, boolean, date", () => {
      const numOps = getOperatorsForType("number").map((o) => o.value);
      expect(numOps).toContain("gt");
      expect(numOps).toContain("lt");
      expect(numOps).toContain("eq");
      expect(numOps).toContain("empty");

      const strOps = getOperatorsForType("string").map((o) => o.value);
      expect(strOps).toContain("contains");
      expect(strOps).toContain("startsWith");
      expect(strOps).toContain("endsWith");
      expect(strOps).not.toContain("gt");

      const boolOps = getOperatorsForType("boolean").map((o) => o.value);
      expect(boolOps).toContain("eq");
      expect(boolOps).toContain("neq");
      expect(boolOps).toContain("empty");

      const dateOps = getOperatorsForType("date").map((o) => o.value);
      expect(dateOps).toContain("before");
      expect(dateOps).toContain("after");
    });

    it("validates rule configuration diagnostics", () => {
      const validNumRule: ConditionalRule = {
        id: "r1",
        operator: "gt",
        value: 10,
        intent: "success",
        enabled: true,
      };
      expect(validateConditionalRule(validNumRule, "number").isValid).toBe(true);

      const missingValRule: ConditionalRule = {
        id: "r2",
        operator: "gt",
        value: undefined,
        intent: "success",
        enabled: true,
      };
      expect(validateConditionalRule(missingValRule, "number").isValid).toBe(false);

      const incompatibleRule: ConditionalRule = {
        id: "r3",
        operator: "contains",
        value: "test",
        intent: "muted",
        enabled: true,
      };
      expect(validateConditionalRule(incompatibleRule, "number").isValid).toBe(false);

      const emptyRule: ConditionalRule = {
        id: "r4",
        operator: "empty",
        intent: "info",
        enabled: true,
      };
      expect(validateConditionalRule(emptyRule, "number").isValid).toBe(true);
    });
  });
});
