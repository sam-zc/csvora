import type { CsvDocument } from "@csvora/csv-core";
import type { PresentationConfig, TablePresentationConfig } from "@csvora/table-engine";
import type { LoadedCsvDocument } from "../csv-ingestion";

export interface CsvPreviewWorkspaceProps {
  /**
   * The successfully ingested document session to preview.
   */
  readonly loadedDocument: LoadedCsvDocument;

  /**
   * Callback to reset and return to the upload workspace.
   */
  readonly onReset: () => void;
}

export interface PreviewHeaderProps {
  readonly loadedDocument: LoadedCsvDocument;
  readonly presentation: TablePresentationConfig;
  readonly onUpdatePresentation?: ((presentation: TablePresentationConfig) => void) | undefined;
  readonly onReset: () => void;
  readonly onResetPresentation?: (() => void) | undefined;
  readonly hasPresentationChanges?: boolean | undefined;
  readonly isSidebarOpen?: boolean | undefined;
  readonly onToggleSidebar?: (() => void) | undefined;
}

export interface RendererHostProps {
  readonly document: CsvDocument;
  readonly presentation: PresentationConfig;
  readonly onUpdatePresentation?: ((presentation: TablePresentationConfig) => void) | undefined;
  readonly selectedColumnId?: string | null | undefined;
  readonly onSelectColumn?: ((columnId: string | null) => void) | undefined;
}

export interface TableRendererProps {
  readonly document: CsvDocument;
  readonly presentation: TablePresentationConfig;
  readonly onUpdatePresentation?: ((presentation: TablePresentationConfig) => void) | undefined;
  readonly selectedColumnId?: string | null | undefined;
  readonly onSelectColumn?: ((columnId: string | null) => void) | undefined;
}
