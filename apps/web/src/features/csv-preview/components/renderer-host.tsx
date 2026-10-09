import type { RendererHostProps } from "../types";
import { DefaultTableRenderer } from "./default-table-renderer";
import { DeparturesBoardRenderer } from "./departures-board-renderer";

/**
 * RendererHost encapsulates the boundary between renderer selection and the active renderer.
 *
 * It maps the current PresentationConfig to the appropriate renderer implementation.
 * Dispatches to:
 * - "table" -> DefaultTableRenderer
 * - "departures" -> DeparturesBoardRenderer
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
    case "departures":
      return (
        <DeparturesBoardRenderer
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
