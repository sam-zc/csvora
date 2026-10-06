import { z } from "zod";

export const columnTypeSchema = z.enum(["string", "number", "boolean", "date"]);

export type ColumnType = z.infer<typeof columnTypeSchema>;

export const columnDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: columnTypeSchema.default("string"),
});

export type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;
export type ColumnInput = z.input<typeof columnDefinitionSchema>;

export const tableConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  columns: z.array(columnDefinitionSchema).default([]),
});

export type TableConfig = z.infer<typeof tableConfigSchema>;
export type TableConfigInput = z.input<typeof tableConfigSchema>;
