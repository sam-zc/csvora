"use client";

import type { CsvDocument } from "@csvora/csv-core";
import {
  type ColumnAlign,
  type ColumnFormat,
  type ColumnPresentation,
  type ColumnType,
  type ConditionalOperator,
  type ConditionalRule,
  type ConditionalRuleInput,
  type DeparturesConfig,
  type PresentationConfig,
  type SemanticIntent,
  MAX_RULES_PER_COLUMN,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  canHideColumn,
  getColumnDisplayLabel,
  getColumnProfile,
  getDefaultAlignmentForType,
  getEffectiveColumnType,
  getOperatorsForType,
  getVisibleColumns,
  validateConditionalRule,
} from "@csvora/table-engine";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
} from "@csvora/ui";

export interface ColumnInspectorSidebarProps {
  readonly column: ColumnPresentation | null;
  readonly document: CsvDocument;
  readonly presentation: PresentationConfig;
  readonly onSelectColumn: (columnId: string | null) => void;
  readonly onUpdateType: (columnId: string, typeOverride: ColumnType | undefined) => void;
  readonly onUpdateAlign: (columnId: string, align: ColumnAlign) => void;
  readonly onUpdateVisibility: (columnId: string, visible: boolean) => void;
  readonly onUpdateWidth: (columnId: string, width: number | undefined) => void;
  readonly onUpdateFormat?:
    | ((columnId: string, format: ColumnFormat | undefined) => void)
    | undefined;
  readonly onAddRule?:
    | ((columnId: string, rule: Omit<ConditionalRuleInput, "id"> & { id?: string }) => void)
    | undefined;
  readonly onUpdateRule?:
    | ((columnId: string, ruleId: string, updates: Partial<Omit<ConditionalRule, "id">>) => void)
    | undefined;
  readonly onRemoveRule?: ((columnId: string, ruleId: string) => void) | undefined;
  readonly onMoveRule?:
    | ((columnId: string, ruleId: string, direction: "up" | "down") => void)
    | undefined;
  readonly onClearRules?: ((columnId: string) => void) | undefined;
  readonly onResetColumn: (columnId: string) => void;
  readonly onUpdateDeparturesMapping?: ((mapping: DeparturesConfig) => void) | undefined;
  readonly onResetDeparturesMapping?: (() => void) | undefined;
  readonly isOpen?: boolean | undefined;
  readonly onClose?: (() => void) | undefined;
}

function getTypeBadgeVariant(type: ColumnType): "default" | "secondary" | "outline" {
  switch (type) {
    case "number":
      return "default";
    case "boolean":
      return "secondary";
    default:
      return "outline";
  }
}

function DeparturesMappingSection({
  presentation,
  onUpdateDeparturesMapping,
  onResetDeparturesMapping,
}: {
  readonly presentation: PresentationConfig;
  readonly onUpdateDeparturesMapping?: ((mapping: DeparturesConfig) => void) | undefined;
  readonly onResetDeparturesMapping?: (() => void) | undefined;
}) {
  const departuresConfig = presentation.rendererConfigs.departures;

  const headerCounts = new Map<string, number>();
  for (const c of presentation.columns) {
    const norm = c.header.trim().toLowerCase();
    headerCounts.set(norm, (headerCounts.get(norm) ?? 0) + 1);
  }
  const duplicateHeaderNames = new Set(
    Array.from(headerCounts.entries())
      .filter((entry) => entry[1] > 1)
      .map((entry) => entry[0]),
  );

  const roles = [
    { key: "timeColumnId" as const, label: "Time", required: true, id: "dep-map-time" },
    { key: "flightColumnId" as const, label: "Flight", required: true, id: "dep-map-flight" },
    {
      key: "destinationColumnId" as const,
      label: "Destination",
      required: true,
      id: "dep-map-destination",
    },
    { key: "gateColumnId" as const, label: "Gate", required: true, id: "dep-map-gate" },
    {
      key: "statusColumnId" as const,
      label: "Status / Delay",
      required: false,
      id: "dep-map-status",
    },
  ];

  return (
    <div className="p-3.5 border-b border-border/70 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
            Renderer
          </div>
          <h3 className="text-xs font-semibold text-foreground">Departures Board</h3>
        </div>
        {onResetDeparturesMapping && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetDeparturesMapping}
            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Reset mappings"
          >
            Reset mappings
          </Button>
        )}
      </div>

      <div className="space-y-2.5 text-xs">
        {roles.map((role) => {
          const currentVal = departuresConfig?.[role.key] ?? "unmapped";
          return (
            <div key={role.key} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor={role.id} className="font-medium text-foreground">
                  {role.label}
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {role.required ? "Required" : "Optional"}
                </span>
              </div>
              <Select
                value={currentVal}
                onValueChange={(val) => {
                  onUpdateDeparturesMapping?.({
                    ...departuresConfig,
                    [role.key]: val === "unmapped" ? undefined : val,
                  });
                }}
              >
                <SelectTrigger
                  id={role.id}
                  aria-label={`Map ${role.label} column`}
                  className="h-7 text-xs bg-background"
                >
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmapped">
                    <span className="text-muted-foreground italic">None (unmapped)</span>
                  </SelectItem>
                  {presentation.columns.map((col) => {
                    const isDup = duplicateHeaderNames.has(col.header.trim().toLowerCase());
                    const label = getColumnDisplayLabel(col);
                    return (
                      <SelectItem key={col.id} value={col.id}>
                        <span>{label}</span>
                        {isDup && (
                          <span className="text-muted-foreground ml-1 font-mono text-[10px]">
                            ({col.id})
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INTENT_OPTIONS: readonly {
  readonly value: SemanticIntent;
  readonly label: string;
  readonly dotClass: string;
}[] = [
  { value: "success", label: "Success", dotClass: "bg-emerald-500" },
  { value: "warning", label: "Warning", dotClass: "bg-amber-500" },
  { value: "danger", label: "Danger", dotClass: "bg-rose-500" },
  { value: "info", label: "Info", dotClass: "bg-sky-500" },
  { value: "muted", label: "Muted", dotClass: "bg-zinc-400" },
];

function ConditionalRulesSection({
  column,
  effectiveType,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onMoveRule,
  onClearRules,
}: {
  readonly column: ColumnPresentation;
  readonly effectiveType: ColumnType;
  readonly onAddRule?:
    | ((columnId: string, rule: Omit<ConditionalRuleInput, "id"> & { id?: string }) => void)
    | undefined;
  readonly onUpdateRule?:
    | ((columnId: string, ruleId: string, updates: Partial<Omit<ConditionalRule, "id">>) => void)
    | undefined;
  readonly onRemoveRule?: ((columnId: string, ruleId: string) => void) | undefined;
  readonly onMoveRule?:
    | ((columnId: string, ruleId: string, direction: "up" | "down") => void)
    | undefined;
  readonly onClearRules?: ((columnId: string) => void) | undefined;
}) {
  const rules = column.conditionalRules ?? [];
  const operators = getOperatorsForType(effectiveType);
  const isAtLimit = rules.length >= MAX_RULES_PER_COLUMN;

  const handleAddDefaultRule = () => {
    if (isAtLimit || !onAddRule) return;

    let defaultOp: ConditionalOperator = "gt";
    let defaultValue: string | number | undefined = 0;
    let defaultIntent: SemanticIntent = "success";

    switch (effectiveType) {
      case "number":
        defaultOp = "gt";
        defaultValue = 0;
        defaultIntent = "success";
        break;
      case "string":
        defaultOp = "contains";
        defaultValue = "";
        defaultIntent = "warning";
        break;
      case "boolean":
        defaultOp = "eq";
        defaultValue = "true";
        defaultIntent = "success";
        break;
      case "date":
        defaultOp = "after";
        defaultValue = "";
        defaultIntent = "info";
        break;
    }

    onAddRule(column.id, {
      operator: defaultOp,
      value: defaultValue,
      intent: defaultIntent,
      enabled: true,
    });
  };

  return (
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">Conditional Rules</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
            {rules.length}/{MAX_RULES_PER_COLUMN}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {rules.length > 0 && onClearRules && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClearRules(column.id)}
              className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear all rules"
            >
              Clear
            </Button>
          )}

          {onAddRule && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAtLimit}
              onClick={handleAddDefaultRule}
              className="h-6 text-[11px] px-2 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Add conditional rule"
            >
              + Add rule
            </Button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="p-3 rounded-lg border border-dashed border-border/70 text-center space-y-1.5 bg-muted/10">
          <p className="text-[11px] text-muted-foreground">
            No rules defined. Add a value condition to highlight cells with semantic intent.
          </p>
          {onAddRule && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDefaultRule}
              className="h-6 text-[11px] px-2 cursor-pointer"
            >
              Add first rule
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground/80 font-mono">
            Evaluated in order. First matching rule wins.
          </p>

          {rules.map((rule, idx) => {
            const opDef = operators.find((o) => o.value === rule.operator);
            const isCurrentOpAllowed = !!opDef;
            const requiresValue = opDef?.requiresValue ?? true;
            const diagnostic = validateConditionalRule(rule, effectiveType);

            return (
              <div
                key={rule.id}
                className={cn(
                  "p-2.5 rounded-lg border text-xs space-y-2 transition-colors",
                  rule.enabled
                    ? "bg-card border-border/80 shadow-2xs"
                    : "bg-muted/20 border-border/40 opacity-70",
                )}
              >
                {/* Rule Card Header: Status, Identity & Reorder/Remove Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={rule.enabled}
                      aria-label={`Toggle rule ${idx + 1}`}
                      onClick={() => onUpdateRule?.(column.id, rule.id, { enabled: !rule.enabled })}
                      className={cn(
                        "size-3.5 rounded border flex items-center justify-center text-[9px] cursor-pointer transition-colors leading-none font-bold",
                        rule.enabled
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-border text-transparent",
                      )}
                    >
                      ✓
                    </button>
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      Rule {idx + 1}
                    </span>
                    {!rule.enabled && (
                      <span className="text-[10px] text-muted-foreground italic font-sans">
                        (disabled)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveRule?.(column.id, rule.id, "up")}
                      className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed text-xs transition-colors"
                      aria-label={`Move rule ${idx + 1} up`}
                      title="Move up (higher priority)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === rules.length - 1}
                      onClick={() => onMoveRule?.(column.id, rule.id, "down")}
                      className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed text-xs transition-colors"
                      aria-label={`Move rule ${idx + 1} down`}
                      title="Move down (lower priority)"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveRule?.(column.id, rule.id)}
                      className="size-5 rounded flex items-center justify-center text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer text-xs ml-0.5 transition-colors"
                      aria-label={`Remove rule ${idx + 1}`}
                      title="Remove rule"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* When Condition: Operator + Optional Value */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium w-9 shrink-0">
                      When
                    </span>
                    <Select
                      value={rule.operator}
                      onValueChange={(val) => {
                        const nextOp = val as ConditionalOperator;
                        const nextDef = operators.find((o) => o.value === nextOp);
                        const nextRequiresValue = nextDef?.requiresValue ?? true;
                        onUpdateRule?.(column.id, rule.id, {
                          operator: nextOp,
                          value: nextRequiresValue ? (rule.value ?? 0) : undefined,
                        });
                      }}
                    >
                      <SelectTrigger
                        id={`rule-op-${rule.id}`}
                        aria-label={`Operator for rule ${idx + 1}`}
                        className="h-7 text-xs bg-background flex-1 cursor-pointer"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                        {!isCurrentOpAllowed && (
                          <SelectItem value={rule.operator}>
                            {rule.operator} (incompatible)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresValue && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-transparent w-9 shrink-0 select-none">
                        Val
                      </span>
                      {effectiveType === "boolean" ? (
                        <Select
                          value={String(rule.value ?? "true")}
                          onValueChange={(val) =>
                            onUpdateRule?.(column.id, rule.id, { value: val })
                          }
                        >
                          <SelectTrigger
                            id={`rule-val-${rule.id}`}
                            aria-label={`Value for rule ${idx + 1}`}
                            className="h-7 text-xs bg-background flex-1 font-mono cursor-pointer"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`rule-val-${rule.id}`}
                          type={effectiveType === "number" ? "number" : "text"}
                          placeholder={
                            effectiveType === "number"
                              ? "0"
                              : effectiveType === "date"
                                ? "YYYY-MM-DD"
                                : "Text value"
                          }
                          value={rule.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (effectiveType === "number") {
                              const trimmed = val.trim();
                              onUpdateRule?.(column.id, rule.id, {
                                value: trimmed === "" ? undefined : Number(trimmed),
                              });
                            } else {
                              onUpdateRule?.(column.id, rule.id, { value: val });
                            }
                          }}
                          aria-label={`Value for rule ${idx + 1}`}
                          className="h-7 text-xs bg-background font-mono flex-1"
                        />
                      )}
                    </div>
                  )}

                  {/* Then Intent Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium w-9 shrink-0">
                      Then
                    </span>
                    <Select
                      value={rule.intent}
                      onValueChange={(val) =>
                        onUpdateRule?.(column.id, rule.id, {
                          intent: val as SemanticIntent,
                        })
                      }
                    >
                      <SelectTrigger
                        id={`rule-intent-${rule.id}`}
                        aria-label={`Intent for rule ${idx + 1}`}
                        className="h-7 text-xs bg-background flex-1 cursor-pointer"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn("size-2 rounded-full shrink-0", opt.dotClass)}
                                aria-hidden="true"
                              />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Diagnostics / Validation Notice */}
                {!diagnostic.isValid && diagnostic.warning && (
                  <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300">
                    ⚠ {diagnostic.warning}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Persistent sidebar inspector for the Visual Editor Workspace.
 *
 * Displays:
 * 1. Renderer-level settings (such as Departures Board field mappings) when active.
 * 2. Column-level settings (type override, alignment, width, visibility, conditional rules) for the selected column.
 * 3. Dataset overview and helpful guidance when no column is selected.
 */
export function ColumnInspectorSidebar({
  column,
  document,
  presentation,
  onSelectColumn,
  onUpdateType,
  onUpdateAlign,
  onUpdateVisibility,
  onUpdateWidth,
  onUpdateFormat,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onMoveRule,
  onClearRules,
  onResetColumn,
  onUpdateDeparturesMapping,
  onResetDeparturesMapping,
  isOpen = true,
  onClose,
}: ColumnInspectorSidebarProps) {
  if (!isOpen) {
    return null;
  }

  const isDeparturesRenderer = presentation.rendererId === "departures";

  // --- Empty Selection State ---
  if (!column) {
    const visibleCount = getVisibleColumns(presentation).length;
    const totalCount = presentation.columns.length;

    return (
      <aside
        aria-label="Column Inspector"
        className="w-72 lg:w-80 shrink-0 border-r border-border/80 bg-surface flex flex-col h-full overflow-y-auto"
      >
        <div className="p-3.5 border-b border-border/60 flex items-center justify-between shrink-0">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
            Inspector
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="lg:hidden text-xs text-muted-foreground hover:text-foreground p-1 rounded"
            >
              ✕
            </button>
          )}
        </div>

        {isDeparturesRenderer && (
          <DeparturesMappingSection
            presentation={presentation}
            onUpdateDeparturesMapping={onUpdateDeparturesMapping}
            onResetDeparturesMapping={onResetDeparturesMapping}
          />
        )}

        <div className="p-6 flex flex-col items-center text-center space-y-4 my-auto">
          <div className="size-12 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground">
            {/* Column selector icon */}
            <svg
              className="size-6 text-muted-foreground/80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Select a column
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[230px]">
              Click any column header in the table to inspect properties, adjust type overrides,
              change alignment, or customize width.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-border/50 text-left space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground font-mono">
              Dataset Overview
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-muted-foreground text-[10px]">Columns</div>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  {visibleCount} of {totalCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-muted-foreground text-[10px]">Total Rows</div>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  {document.rowCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/70 font-mono">
            Press{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted text-foreground text-[10px]">Esc</kbd> to
            clear selection
          </p>
        </div>
      </aside>
    );
  }

  // --- Active Column Selected State ---
  const displayLabel = getColumnDisplayLabel(column);
  const isRawHeaderEmpty = column.header.trim().length === 0;
  const effectiveType = getEffectiveColumnType(column);
  const isTypeOverridden = column.typeOverride !== undefined;
  const defaultAlign = getDefaultAlignmentForType(column.inferredType);
  const isAlignModified = column.align !== defaultAlign;
  const isWidthModified = column.width !== undefined;
  const isVisibilityModified = !column.visible;
  const isFormatModified = column.format !== undefined;
  const hasConditionalRules = (column.conditionalRules?.length ?? 0) > 0;
  const isModified =
    isTypeOverridden ||
    isAlignModified ||
    isWidthModified ||
    isVisibilityModified ||
    isFormatModified ||
    hasConditionalRules;
  const canHide = canHideColumn(presentation, column.id);

  const profile = getColumnProfile(document, column.sourceIndex);

  const handleTypeSelect = (value: string) => {
    if (value === "auto") {
      onUpdateType(column.id, undefined);
    } else if (
      value === "string" ||
      value === "number" ||
      value === "boolean" ||
      value === "date"
    ) {
      onUpdateType(column.id, value);
    }
  };

  return (
    <aside
      aria-label="Column Inspector"
      className="w-72 lg:w-80 shrink-0 border-r border-border/80 bg-surface flex flex-col h-full overflow-y-auto"
    >
      {isDeparturesRenderer && (
        <DeparturesMappingSection
          presentation={presentation}
          onUpdateDeparturesMapping={onUpdateDeparturesMapping}
          onResetDeparturesMapping={onResetDeparturesMapping}
        />
      )}

      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-surface-muted/30 shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
            <span>Column Inspector</span>
            {isModified && (
              <span className="size-1.5 rounded-full bg-accent" aria-label="Modified" />
            )}
          </div>
          <h2
            className="text-sm font-semibold text-foreground tracking-tight truncate mt-0.5"
            title={displayLabel}
          >
            {displayLabel}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectColumn(null)}
            aria-label="Deselect column"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Deselect
          </Button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Hidden Column Banner */}
      {!column.visible && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px]">This column is hidden from the table.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUpdateVisibility(column.id, true)}
            className="h-6 text-[10px] px-2 bg-background cursor-pointer"
          >
            Show column
          </Button>
        </div>
      )}

      {/* Scrollable Inspector Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Identifiers & Details */}
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-medium">
            {column.id}
          </span>
          <span>Index: {column.sourceIndex}</span>
        </div>

        {isRawHeaderEmpty && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 italic">
            Source header was empty. Displaying fallback label &quot;{displayLabel}&quot;.
          </div>
        )}

        {/* Content Profile & Inferred Type Card */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
              Detected Type
            </span>
            <Badge variant={getTypeBadgeVariant(column.inferredType)} className="capitalize">
              {column.inferredType}
            </Badge>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">Non-empty:</span>
            <span className="font-semibold text-foreground">{profile.nonEmptyCount}</span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">Empty:</span>
            <span className="text-muted-foreground">{profile.emptyCount}</span>
          </div>
        </div>

        <Separator />

        {/* Type Override Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`type-select-${column.id}`}
              className="text-xs font-medium text-foreground"
            >
              Display type
            </label>
            {isTypeOverridden ? (
              <span className="text-[10px] font-semibold text-accent font-mono">
                Override active
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-mono">
                Auto ({column.inferredType})
              </span>
            )}
          </div>

          <Select value={column.typeOverride ?? "auto"} onValueChange={handleTypeSelect}>
            <SelectTrigger
              id={`type-select-${column.id}`}
              aria-label={`Display type for column ${displayLabel}`}
              className="h-8 text-xs cursor-pointer bg-background"
            >
              <SelectValue placeholder="Select display type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <span className="font-medium">Auto</span>
                <span className="text-muted-foreground ml-1.5 capitalize">
                  ({column.inferredType})
                </span>
              </SelectItem>
              <SelectItem value="string">String (text)</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Semantic Number / Currency Format Control */}
        {effectiveType === "number" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`format-select-${column.id}`}
                className="text-xs font-medium text-foreground"
              >
                Number format
              </label>
              {column.format && (
                <span className="text-[10px] font-semibold text-accent font-mono capitalize">
                  {column.format.kind === "currency"
                    ? column.format.options.currency
                    : column.format.kind}
                </span>
              )}
            </div>

            <Select
              value={
                column.format?.kind === "currency"
                  ? `currency-${column.format.options.currency}`
                  : column.format?.kind === "percent"
                    ? "percent"
                    : "standard"
              }
              onValueChange={(val) => {
                if (!onUpdateFormat) return;
                if (val === "currency-INR") {
                  onUpdateFormat(column.id, {
                    kind: "currency",
                    options: { currency: "INR", locale: "en-IN" },
                  });
                } else if (val === "currency-USD") {
                  onUpdateFormat(column.id, {
                    kind: "currency",
                    options: { currency: "USD", locale: "en-US" },
                  });
                } else if (val === "percent") {
                  onUpdateFormat(column.id, {
                    kind: "percent",
                    options: { locale: "en-US" },
                  });
                } else {
                  onUpdateFormat(column.id, undefined);
                }
              }}
            >
              <SelectTrigger
                id={`format-select-${column.id}`}
                aria-label={`Number format for column ${displayLabel}`}
                className="h-8 text-xs cursor-pointer bg-background"
              >
                <SelectValue placeholder="Standard (raw)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (raw)</SelectItem>
                <SelectItem value="currency-INR">Currency (INR ₹)</SelectItem>
                <SelectItem value="currency-USD">Currency (USD $)</SelectItem>
                <SelectItem value="percent">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Alignment Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Alignment</span>
            <span className="text-[10px] text-muted-foreground capitalize font-mono">
              {column.align}
              {column.align === defaultAlign && " (default)"}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={`Alignment for column ${displayLabel}`}
            className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border/50"
          >
            {(["left", "center", "right"] as const).map((alignOption) => {
              const isSelected = column.align === alignOption;
              return (
                <button
                  key={alignOption}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onUpdateAlign(column.id, alignOption)}
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer text-center",
                    isSelected
                      ? "bg-background text-foreground shadow-2xs font-semibold border border-border/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  )}
                >
                  {alignOption}
                </button>
              );
            })}
          </div>
        </div>

        {/* Width Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`width-input-${column.id}`}
              className="text-xs font-medium text-foreground"
            >
              Width
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {column.width !== undefined ? `${column.width}px` : "Auto"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              id={`width-input-${column.id}`}
              type="number"
              min={MIN_COLUMN_WIDTH}
              max={MAX_COLUMN_WIDTH}
              placeholder="Auto"
              value={column.width ?? ""}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === "") {
                  onUpdateWidth(column.id, undefined);
                } else {
                  const num = parseInt(val, 10);
                  if (!Number.isNaN(num)) {
                    onUpdateWidth(column.id, num);
                  }
                }
              }}
              aria-label={`Width in pixels for column ${displayLabel}`}
              className="h-8 text-xs font-mono w-24 bg-background"
            />

            <div className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => onUpdateWidth(column.id, undefined)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center",
                  column.width === undefined
                    ? "bg-secondary text-secondary-foreground border-border font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/50",
                )}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => onUpdateWidth(column.id, 120)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center",
                  column.width === 120
                    ? "bg-secondary text-secondary-foreground border-border font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/50",
                )}
              >
                120
              </button>
              <button
                type="button"
                onClick={() => onUpdateWidth(column.id, 200)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center",
                  column.width === 200
                    ? "bg-secondary text-secondary-foreground border-border font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/50",
                )}
              >
                200
              </button>
            </div>
          </div>
        </div>

        {/* Visibility Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Visibility</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {column.visible ? "Visible" : "Hidden"}
            </span>
          </div>

          <Button
            type="button"
            variant={column.visible ? "outline" : "secondary"}
            size="sm"
            disabled={column.visible && !canHide}
            title={
              column.visible && !canHide ? "At least one column must remain visible" : undefined
            }
            onClick={() => onUpdateVisibility(column.id, !column.visible)}
            className="w-full text-xs h-8 cursor-pointer"
            aria-label={
              column.visible ? `Hide column ${displayLabel}` : `Show column ${displayLabel}`
            }
          >
            {column.visible ? "Hide column" : "Show column"}
          </Button>
        </div>

        <Separator />

        {/* Conditional Rules Section */}
        <ConditionalRulesSection
          column={column}
          effectiveType={effectiveType}
          onAddRule={onAddRule}
          onUpdateRule={onUpdateRule}
          onRemoveRule={onRemoveRule}
          onMoveRule={onMoveRule}
          onClearRules={onClearRules}
        />

        <Separator />

        {/* Effective State & Reset Action */}
        <div className="pt-1 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground font-mono">
            Effective:{" "}
            <span className="font-semibold text-foreground uppercase">{effectiveType}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onResetColumn(column.id)}
            disabled={!isModified}
            className="h-8 text-xs px-3 cursor-pointer disabled:cursor-not-allowed"
          >
            Reset
          </Button>
        </div>
      </div>
    </aside>
  );
}
