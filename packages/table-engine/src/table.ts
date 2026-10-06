import type { TableConfig, ColumnDefinition } from "@csvora/schemas";

export interface CreateTableParams {
  id: string;
  name: string;
  columns?: Array<{ id: string; name: string }>;
}

export function createDefaultTableConfig(params: CreateTableParams): TableConfig {
  const columns: ColumnDefinition[] = (params.columns ?? []).map((col) => ({
    id: col.id,
    name: col.name,
    type: "string",
  }));

  return {
    id: params.id,
    name: params.name,
    columns,
  };
}
