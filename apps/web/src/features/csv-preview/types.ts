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
  readonly onReset: () => void;
}

export interface RendererHostProps {
  readonly document: CsvDocument;
  readonly presentation: PresentationConfig;
}

export interface TableRendererProps {
  readonly document: CsvDocument;
  readonly presentation: TablePresentationConfig;
}
