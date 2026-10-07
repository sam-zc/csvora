"use client";

import { useState } from "react";
import {
  createDefaultPresentation,
  getDefaultAlignmentForType,
  type TablePresentationConfig,
} from "@csvora/table-engine";
import type { CsvPreviewWorkspaceProps } from "../types";
import { PreviewHeader } from "./preview-header";
import { RendererHost } from "./renderer-host";

/**
 * CsvPreviewWorkspace is the top-level host for previewing loaded CSV documents.
 *
 * It manages the active PresentationConfig (initialized cleanly from the canonical CsvDocument),
 * coordinates the preview header, and hosts the visual renderer.
 */
export function CsvPreviewWorkspace({ loadedDocument, onReset }: CsvPreviewWorkspaceProps) {
  const [presentation, setPresentation] = useState<TablePresentationConfig>(() =>
    createDefaultPresentation(loadedDocument.document),
  );

  const hasPresentationChanges = presentation.columns.some((col) => {
    const defaultAlign = getDefaultAlignmentForType(col.inferredType);
    return col.typeOverride !== undefined || col.align !== defaultAlign;
  });

  const handleResetPresentation = () => {
    setPresentation(createDefaultPresentation(loadedDocument.document));
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Document & Workspace Navigation Header */}
      <PreviewHeader
        loadedDocument={loadedDocument}
        onReset={onReset}
        onResetPresentation={handleResetPresentation}
        hasPresentationChanges={hasPresentationChanges}
      />

      {/* Minimal Renderer Context Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[11px]">
            Table View
          </span>
          <span>Default table preview</span>
          {hasPresentationChanges && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              • Custom column settings active
            </span>
          )}
        </div>

        <div className="font-mono text-[11px]">
          {loadedDocument.document.rowCount.toLocaleString()} rows rendered via virtualization
        </div>
      </div>

      {/* Visual Renderer Boundary */}
      <section aria-label="CSV Preview">
        <RendererHost
          document={loadedDocument.document}
          presentation={presentation}
          onUpdatePresentation={setPresentation}
        />
      </section>
    </div>
  );
}
