import type { RendererHostProps } from "../types";
import { DefaultTableRenderer } from "./default-table-renderer";

/**
 * RendererHost encapsulates the boundary between renderer selection and the active renderer.
 *
 * It maps the current PresentationConfig to the appropriate renderer implementation.
 * Currently dispatches to DefaultTableRenderer for the "table" rendererId.
 */
export function RendererHost({
  document,
  presentation,
  onUpdatePresentation,
  selectedColumnId,
  onSelectColumn,
}: RendererHostProps) {
  switch (presentation.rendererId) {
    case "table":
      return (
        <DefaultTableRenderer
          document={document}
          presentation={presentation}
          onUpdatePresentation={onUpdatePresentation}
          selectedColumnId={selectedColumnId}
          onSelectColumn={onSelectColumn}
        />
      );
    default: {
      const _unreachable: never = presentation.rendererId;
      throw new Error(`Unsupported renderer: ${String(_unreachable)}`);
    }
  }
}
