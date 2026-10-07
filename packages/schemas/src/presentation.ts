import { z } from "zod";
import { columnTypeSchema } from "./table-config";

/**
 * Identifier for registered visual renderers.
 * Currently supports the default "table" renderer.
 */
export const rendererIdSchema = z.enum(["table"]);
export type RendererId = z.infer<typeof rendererIdSchema>;

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
});

export type ColumnPresentation = z.infer<typeof columnPresentationSchema>;
export type ColumnPresentationInput = z.input<typeof columnPresentationSchema>;

/**
 * Presentation configuration for the default table renderer.
 */
export const tablePresentationConfigSchema = z.object({
  rendererId: z.literal("table").default("table"),
  columns: z.array(columnPresentationSchema).default([]),
});

export type TablePresentationConfig = z.infer<typeof tablePresentationConfigSchema>;
export type TablePresentationConfigInput = z.input<typeof tablePresentationConfigSchema>;

/**
 * Top-level presentation configuration contract.
 * Discriminated by rendererId (presently "table").
 */
export const presentationConfigSchema = tablePresentationConfigSchema;
export type PresentationConfig = z.infer<typeof presentationConfigSchema>;
export type PresentationConfigInput = z.input<typeof presentationConfigSchema>;
