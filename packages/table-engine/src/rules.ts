import type {
  ColumnPresentation,
  ColumnType,
  ConditionalOperator,
  ConditionalRule,
  ConditionalRuleInput,
  PresentationConfig,
  SemanticIntent,
} from "@csvora/schemas";

/**
 * Maximum number of conditional rules allowed per column.
 * Prevents accidental pathological states or infinite rule chains.
 */
export const MAX_RULES_PER_COLUMN = 20;

let localRuleCounter = 0;

/**
 * Generates a stable, unique, deterministic local identifier for a conditional rule.
 * Avoids heavy external UUID dependencies.
 */
export function generateRuleId(): string {
  localRuleCounter += 1;
  const time = Date.now().toString(36);
  const counter = localRuleCounter.toString(36);
  const rand = Math.random().toString(36).substring(2, 7);
  return `rule_${time}_${counter}_${rand}`;
}

/**
 * Operator definition with human-facing display label and value requirement metadata.
 */
export interface OperatorDefinition {
  readonly value: ConditionalOperator;
  readonly label: string;
  readonly requiresValue: boolean;
}

/**
 * Returns available operators appropriate for a column's effective semantic data type.
 */
export function getOperatorsForType(type: ColumnType): readonly OperatorDefinition[] {
  switch (type) {
    case "number":
      return [
        { value: "gt", label: "Greater than (>)", requiresValue: true },
        { value: "gte", label: "Greater than or equal (≥)", requiresValue: true },
        { value: "lt", label: "Less than (<)", requiresValue: true },
        { value: "lte", label: "Less than or equal (≤)", requiresValue: true },
        { value: "eq", label: "Equals (=)", requiresValue: true },
        { value: "neq", label: "Not equals (≠)", requiresValue: true },
        { value: "empty", label: "Is empty", requiresValue: false },
        { value: "notEmpty", label: "Is not empty", requiresValue: false },
      ] as const;

    case "string":
      return [
        { value: "eq", label: "Equals", requiresValue: true },
        { value: "neq", label: "Not equals", requiresValue: true },
        { value: "contains", label: "Contains", requiresValue: true },
        { value: "startsWith", label: "Starts with", requiresValue: true },
        { value: "endsWith", label: "Ends with", requiresValue: true },
        { value: "empty", label: "Is empty", requiresValue: false },
        { value: "notEmpty", label: "Is not empty", requiresValue: false },
      ] as const;

    case "boolean":
      return [
        { value: "eq", label: "Equals", requiresValue: true },
        { value: "neq", label: "Not equals", requiresValue: true },
        { value: "empty", label: "Is empty", requiresValue: false },
        { value: "notEmpty", label: "Is not empty", requiresValue: false },
      ] as const;

    case "date":
      return [
        { value: "eq", label: "Equals", requiresValue: true },
        { value: "before", label: "Before", requiresValue: true },
        { value: "after", label: "After", requiresValue: true },
        { value: "empty", label: "Is empty", requiresValue: false },
        { value: "notEmpty", label: "Is not empty", requiresValue: false },
      ] as const;

    default: {
      return [];
    }
  }
}

/**
 * Validates a conditional rule against an effective column type.
 * Returns concise diagnostics without throwing exceptions.
 */
export function validateConditionalRule(
  rule: ConditionalRule,
  effectiveType: ColumnType,
): { isValid: boolean; warning?: string } {
  const allowedOps = getOperatorsForType(effectiveType);
  const opDef = allowedOps.find((o) => o.value === rule.operator);

  if (!opDef) {
    return {
      isValid: false,
      warning: `Operator "${rule.operator}" is not compatible with ${effectiveType} columns`,
    };
  }

  if (opDef.requiresValue) {
    if (rule.value === undefined || rule.value === null || String(rule.value).trim() === "") {
      return {
        isValid: false,
        warning: "Comparison value is required for this operator",
      };
    }

    if (effectiveType === "number") {
      const num = typeof rule.value === "number" ? rule.value : Number(String(rule.value).trim());
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return {
          isValid: false,
          warning: "Comparison value must be a valid number",
        };
      }
    }

    if (effectiveType === "date") {
      const date = new Date(String(rule.value).trim());
      if (Number.isNaN(date.getTime())) {
        return {
          isValid: false,
          warning: "Comparison value must be a valid date",
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Evaluates a single conditional rule against a raw cell value using the column's effective semantic type.
 *
 * Rules:
 * - Disabled rules never match.
 * - `empty` matches strictly when rawValue is undefined or "".
 * - `notEmpty` matches strictly when rawValue is defined and !== "".
 * - For all other operators, an empty cell does not match.
 * - Always evaluates against the raw semantic value, never the formatted display text.
 * - Never throws on malformed numbers or dates; safely evaluates as false (non-match).
 */
export function evaluateConditionalRule(
  rule: ConditionalRule,
  rawValue: string | undefined,
  effectiveType: ColumnType,
): boolean {
  if (rule.enabled === false) {
    return false;
  }

  const isEmpty = rawValue === undefined || rawValue === "";

  if (rule.operator === "empty") {
    return isEmpty;
  }

  if (rule.operator === "notEmpty") {
    return !isEmpty;
  }

  if (isEmpty) {
    return false;
  }

  try {
    switch (effectiveType) {
      case "number": {
        const trimmed = rawValue.trim();
        const num = Number(trimmed);
        if (trimmed === "" || Number.isNaN(num) || !Number.isFinite(num)) {
          return false;
        }

        if (rule.value === undefined || rule.value === null) {
          return false;
        }

        const targetNum =
          typeof rule.value === "number" ? rule.value : Number(String(rule.value).trim());
        if (Number.isNaN(targetNum) || !Number.isFinite(targetNum)) {
          return false;
        }

        switch (rule.operator) {
          case "gt":
            return num > targetNum;
          case "gte":
            return num >= targetNum;
          case "lt":
            return num < targetNum;
          case "lte":
            return num <= targetNum;
          case "eq":
            return num === targetNum;
          case "neq":
            return num !== targetNum;
          default:
            return false;
        }
      }

      case "string": {
        const target = rule.value !== undefined ? String(rule.value) : "";
        const a = rawValue.toLowerCase();
        const b = target.toLowerCase();

        switch (rule.operator) {
          case "eq":
            return a === b;
          case "neq":
            return a !== b;
          case "contains":
            return a.includes(b);
          case "startsWith":
            return a.startsWith(b);
          case "endsWith":
            return a.endsWith(b);
          default:
            return false;
        }
      }

      case "boolean": {
        const lower = rawValue.trim().toLowerCase();
        let boolVal: boolean | undefined;
        if (lower === "true" || lower === "1" || lower === "yes") {
          boolVal = true;
        } else if (lower === "false" || lower === "0" || lower === "no") {
          boolVal = false;
        }

        if (boolVal === undefined || rule.value === undefined || rule.value === null) {
          return false;
        }

        let targetBool: boolean | undefined;
        if (typeof rule.value === "boolean") {
          targetBool = rule.value;
        } else if (typeof rule.value === "string") {
          const t = rule.value.trim().toLowerCase();
          if (t === "true" || t === "1" || t === "yes") {
            targetBool = true;
          } else if (t === "false" || t === "0" || t === "no") {
            targetBool = false;
          }
        }

        if (targetBool === undefined) {
          return false;
        }

        switch (rule.operator) {
          case "eq":
            return boolVal === targetBool;
          case "neq":
            return boolVal !== targetBool;
          default:
            return false;
        }
      }

      case "date": {
        const trimmed = rawValue.trim();
        const d = new Date(trimmed);
        const time = d.getTime();
        if (
          trimmed === "" ||
          Number.isNaN(time) ||
          rule.value === undefined ||
          rule.value === null
        ) {
          return false;
        }

        const targetD = new Date(String(rule.value).trim());
        const targetTime = targetD.getTime();
        if (Number.isNaN(targetTime)) {
          return false;
        }

        switch (rule.operator) {
          case "before":
          case "lt":
            return time < targetTime;
          case "after":
          case "gt":
            return time > targetTime;
          case "eq":
            return time === targetTime;
          case "neq":
            return time !== targetTime;
          default:
            return false;
        }
      }

      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Resolves the semantic visual intent for a single cell based on its column's conditional rules.
 *
 * Rules:
 * - Evaluates rules in array order.
 * - First matching rule wins (rule precedence).
 * - Returns undefined if no rules match or if rules list is empty.
 */
export function resolveConditionalIntent({
  rawValue,
  column,
  rules,
}: {
  readonly rawValue: string | undefined;
  readonly column: ColumnPresentation;
  readonly rules?: readonly ConditionalRule[] | undefined;
}): SemanticIntent | undefined {
  const activeRules = rules ?? column.conditionalRules ?? [];
  if (activeRules.length === 0) {
    return undefined;
  }

  const effectiveType = column.typeOverride ?? column.inferredType;

  for (const rule of activeRules) {
    if (evaluateConditionalRule(rule, rawValue, effectiveType)) {
      return rule.intent;
    }
  }

  return undefined;
}

/**
 * Immutably adds a conditional rule to a column in PresentationConfig.
 * If column already has MAX_RULES_PER_COLUMN (20), returns presentation unchanged.
 */
export function addConditionalRule(
  presentation: PresentationConfig,
  columnId: string,
  ruleInput: Omit<ConditionalRuleInput, "id"> & { readonly id?: string },
): PresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;

    const existingRules = col.conditionalRules ?? [];
    if (existingRules.length >= MAX_RULES_PER_COLUMN) {
      return col;
    }

    const newRule: ConditionalRule = {
      id: ruleInput.id ?? generateRuleId(),
      operator: ruleInput.operator,
      value: ruleInput.value,
      intent: ruleInput.intent,
      enabled: ruleInput.enabled ?? true,
    };

    return {
      ...col,
      conditionalRules: [...existingRules, newRule],
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably updates a specific conditional rule by ID on a column.
 */
export function updateConditionalRule(
  presentation: PresentationConfig,
  columnId: string,
  ruleId: string,
  updates: Partial<Omit<ConditionalRule, "id">>,
): PresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;

    const existingRules = col.conditionalRules ?? [];
    const nextRules = existingRules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      return {
        ...rule,
        ...updates,
      };
    });

    return {
      ...col,
      conditionalRules: nextRules,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably removes a conditional rule by ID from a column.
 */
export function removeConditionalRule(
  presentation: PresentationConfig,
  columnId: string,
  ruleId: string,
): PresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;

    const existingRules = col.conditionalRules ?? [];
    return {
      ...col,
      conditionalRules: existingRules.filter((r) => r.id !== ruleId),
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably moves a conditional rule up or down in evaluation priority order.
 */
export function moveConditionalRule(
  presentation: PresentationConfig,
  columnId: string,
  ruleId: string,
  direction: "up" | "down",
): PresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;

    const existingRules = [...(col.conditionalRules ?? [])];
    const fromIndex = existingRules.findIndex((r) => r.id === ruleId);
    if (fromIndex === -1) return col;

    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= existingRules.length) return col;

    const [removed] = existingRules.splice(fromIndex, 1);
    if (!removed) return col;
    existingRules.splice(toIndex, 0, removed);

    return {
      ...col,
      conditionalRules: existingRules,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably clears all conditional rules on a specific column.
 */
export function clearConditionalRules(
  presentation: PresentationConfig,
  columnId: string,
): PresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      conditionalRules: [],
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}
