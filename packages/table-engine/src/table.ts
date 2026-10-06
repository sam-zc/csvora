import { tableConfigSchema, type TableConfig, type ColumnInput } from "@csvora/schemas";

export interface CreateTableParams {
  id: string;
  name: string;
  columns?: ColumnInput[];
}

export function createDefaultTableConfig(params: CreateTableParams): TableConfig {
  return tableConfigSchema.parse({
    id: params.id,
    name: params.name,
    columns: params.columns ?? [],
  });
}
