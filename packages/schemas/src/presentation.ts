import { z } from "zod";
import { columnTypeSchema } from "./table-config";

/**
 * Identifier for registered visual renderers.
 * Supports "table" and "departures".
 */
export const rendererIdSchema = z.enum(["table", "departures"]);
export type RendererId = z.infer<typeof rendererIdSchema>;

/**
 * Field mappings configuration for the airport departures board renderer.
 * Maps semantic display roles to stable column identifiers (e.g. "col_0").
 */
export const departuresConfigSchema = z.object({
  timeColumnId: z.string().min(1).optional(),
  flightColumnId: z.string().min(1).optional(),
  destinationColumnId: z.string().min(1).optional(),
  gateColumnId: z.string().min(1).optional(),
  statusColumnId: z.string().min(1).optional(),
});

export type DeparturesConfig = z.infer<typeof departuresConfigSchema>;
export type DeparturesConfigInput = z.input<typeof departuresConfigSchema>;

/**
 * Renderer-specific configuration container.
 * Retains settings per renderer across switching without loss.
 */
export const rendererConfigsSchema = z.object({
  departures: departuresConfigSchema.optional(),
});

export type RendererConfigs = z.infer<typeof rendererConfigsSchema>;
export type RendererConfigsInput = z.input<typeof rendererConfigsSchema>;

/**
 * Text alignment for presentation columns.
 */
export const columnAlignSchema = z.enum(["left", "right", "center"]);
export type ColumnAlign = z.infer<typeof columnAlignSchema>;

/**
 * Bounds for column width in logical pixels.
 */
export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 600;

/**
 * Validates a custom column width in logical pixels.
 * Must be an integer between MIN_COLUMN_WIDTH (80) and MAX_COLUMN_WIDTH (600).
 */
export const columnWidthSchema = z.number().int().min(MIN_COLUMN_WIDTH).max(MAX_COLUMN_WIDTH);
export type ColumnWidth = z.infer<typeof columnWidthSchema>;

/**
 * Options for numeric cell formatting.
 */
export const numberFormatOptionsSchema = z.object({
  locale: z.string().optional(),
  minimumFractionDigits: z.number().int().min(0).max(20).optional(),
  maximumFractionDigits: z.number().int().min(0).max(20).optional(),
  useGrouping: z.boolean().optional(),
});

export type NumberFormatOptions = z.infer<typeof numberFormatOptionsSchema>;

/**
 * Options for currency cell formatting.
 */
export const currencyFormatOptionsSchema = z.object({
  currency: z.string().min(1).default("USD"),
  locale: z.string().optional(),
  minimumFractionDigits: z.number().int().min(0).max(20).optional(),
  maximumFractionDigits: z.number().int().min(0).max(20).optional(),
  display: z.enum(["symbol", "narrowSymbol", "code", "name"]).optional(),
});

export type CurrencyFormatOptions = z.infer<typeof currencyFormatOptionsSchema>;

/**
 * Options for percentage cell formatting.
 */
export const percentFormatOptionsSchema = z.object({
  locale: z.string().optional(),
  minimumFractionDigits: z.number().int().min(0).max(20).optional(),
  maximumFractionDigits: z.number().int().min(0).max(20).optional(),
  basis: z.enum(["fraction", "percentage"]).optional(),
});

export type PercentFormatOptions = z.infer<typeof percentFormatOptionsSchema>;

/**
 * Options for date/time cell formatting.
 */
export const dateFormatOptionsSchema = z.object({
  locale: z.string().optional(),
  dateStyle: z.enum(["full", "long", "medium", "short"]).optional(),
  timeStyle: z.enum(["full", "long", "medium", "short"]).optional(),
});

export type DateFormatOptions = z.infer<typeof dateFormatOptionsSchema>;

/**
 * Options for boolean cell formatting.
 */
export const booleanFormatOptionsSchema = z.object({
  trueLabel: z.string().default("true"),
  falseLabel: z.string().default("false"),
});

export type BooleanFormatOptions = z.infer<typeof booleanFormatOptionsSchema>;

/**
 * Options for text cell formatting.
 */
export const textFormatOptionsSchema = z.object({
  transform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
});

export type TextFormatOptions = z.infer<typeof textFormatOptionsSchema>;

/**
 * Semantic format rule for column display values.
 */
export const columnFormatSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    options: textFormatOptionsSchema.optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
  z.object({
    kind: z.literal("number"),
    options: numberFormatOptionsSchema.optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
  z.object({
    kind: z.literal("currency"),
    options: currencyFormatOptionsSchema,
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
  z.object({
    kind: z.literal("percent"),
    options: percentFormatOptionsSchema.optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
  z.object({
    kind: z.literal("date"),
    options: dateFormatOptionsSchema.optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
  z.object({
    kind: z.literal("boolean"),
    options: booleanFormatOptionsSchema.optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
]);

export type ColumnFormat = z.infer<typeof columnFormatSchema>;
export type ColumnFormatInput = z.input<typeof columnFormatSchema>;

/**
 * Presentation-level configuration for a single column.
 * Separates raw CSV data structure from visual presentation parameters.
 */
export const columnPresentationSchema = z.object({
  /**
   * Stable internal identifier for this column (e.g. "col_0", "col_1").
   * Guaranteed unique even when CSV headers are duplicate or empty.
   */
  id: z.string().min(1),

  /**
   * 0-based field index in the underlying CsvRow.
   */
  sourceIndex: z.number().int().nonnegative(),

  /**
   * The original header string from CsvDocument.headers, preserved without mutation.
   */
  header: z.string(),

  /**
   * Whether this column is visible in the visual renderer. Defaults to true.
   */
  visible: z.boolean().default(true),

  /**
   * Preferred horizontal alignment for cell contents.
   */
  align: columnAlignSchema.default("left"),

  /**
   * Semantic data type inferred from raw CSV cell values.
   */
  inferredType: columnTypeSchema.default("string"),

  /**
   * User-specified presentation type override.
   * When undefined or omitted, presentation uses inferredType.
   */
  typeOverride: columnTypeSchema.optional(),

  /**
   * Optional custom column width in logical pixels.
   * When undefined or omitted, the column uses automatic/content-based width.
   */
  width: columnWidthSchema.optional(),

  /**
   * Optional semantic format configuration for values in this column.
   */
  format: columnFormatSchema.optional(),
});

export type ColumnPresentation = z.infer<typeof columnPresentationSchema>;
export type ColumnPresentationInput = z.input<typeof columnPresentationSchema>;

/**
 * Top-level presentation configuration contract.
 * Contains active rendererId, columns presentation models, and per-renderer configuration bags.
 */
export const presentationConfigSchema = z.object({
  rendererId: rendererIdSchema.default("table"),
  columns: z.array(columnPresentationSchema).default([]),
  rendererConfigs: rendererConfigsSchema.default({}),
});

export type PresentationConfig = z.infer<typeof presentationConfigSchema>;
export type PresentationConfigInput = z.input<typeof presentationConfigSchema>;

/**
 * Backward-compatible alias for table presentation configuration.
 */
export const tablePresentationConfigSchema = presentationConfigSchema;
export type TablePresentationConfig = PresentationConfig;
export type TablePresentationConfigInput = PresentationConfigInput;
