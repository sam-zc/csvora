import type { CsvDiagnostic } from "@csvora/csv-core";
import { Badge } from "@csvora/ui";

interface CsvDiagnosticsProps {
  readonly diagnostics: readonly CsvDiagnostic[];
}

/**
 * Compact and expandable diagnostic summary for CSV parsing issues.
 */
export function CsvDiagnostics({ diagnostics }: CsvDiagnosticsProps) {
  if (diagnostics.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <Badge variant="success">Clean</Badge>
        <span>No parsing issues detected.</span>
      </div>
    );
  }

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  return (
    <div className="w-full rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {errors.length > 0 && (
            <Badge variant="destructive">
              {errors.length} {errors.length === 1 ? "Error" : "Errors"}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="warning">
              {warnings.length} {warnings.length === 1 ? "Warning" : "Warnings"}
            </Badge>
          )}
          <span className="text-xs font-medium text-foreground">
            {errors.length > 0
              ? "Syntax issues detected during parsing"
              : "Formatting warnings recorded (data preserved)"}
          </span>
        </div>
      </div>

      <details className="text-xs text-muted-foreground group">
        <summary className="cursor-pointer font-medium text-foreground/80 hover:text-foreground select-none list-none flex items-center gap-1.5 transition-colors">
          <span className="transition-transform group-open:rotate-90">›</span>
          <span>View all diagnostics ({diagnostics.length})</span>
        </summary>

        <ul className="mt-3 space-y-2 border-t border-border/60 pt-3 max-h-48 overflow-y-auto">
          {diagnostics.map((diag, index) => {
            const isError = diag.severity === "error";
            const location =
              diag.line !== undefined
                ? `Line ${diag.line}${diag.column !== undefined ? `, Col ${diag.column}` : ""}`
                : null;

            return (
              <li
                key={`${diag.code}-${diag.line ?? 0}-${index}`}
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 uppercase font-semibold ${
                    isError
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {diag.code}
                </span>

                <div className="flex-1">
                  <span className="text-foreground/90">{diag.message}</span>
                  {location && (
                    <span className="ml-1.5 text-muted-foreground text-[11px]">({location})</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
