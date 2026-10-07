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
