"use client";

import { useEffect, useState } from "react";
import {
  createDefaultPresentation,
  getDefaultAlignmentForType,
  resetColumnPresentation,
  resetDeparturesMapping,
  setColumnAlignment,
  setColumnFormat,
  setColumnTypeOverride,
  setColumnVisibility,
  setColumnWidth,
  setDeparturesMapping,
  type PresentationConfig,
} from "@csvora/table-engine";
import { cn } from "@csvora/ui";
import type { CsvPreviewWorkspaceProps } from "../types";
import { ColumnInspectorSidebar } from "./column-inspector-sidebar";
import { PreviewHeader } from "./preview-header";
import { RendererHost } from "./renderer-host";

/**
 * CsvPreviewWorkspace coordinates the visual data design studio.
 *
 * Structure:
 * 1. Top Bar: Quiet editor chrome (branding, file identity, renderer switcher, columns manager, file actions)
 * 2. Left Sidebar: Persistent inspector panel for active renderer and selected column
 * 3. Main Design Canvas: Centered, warm neutral workspace with subtle dotted grid hosting the visual renderer
 * 4. Bottom Status Bar: Minimal workspace telemetry and interaction hints
 */
export function CsvPreviewWorkspace({ loadedDocument, onReset }: CsvPreviewWorkspaceProps) {
  const [presentation, setPresentation] = useState<PresentationConfig>(() =>
    createDefaultPresentation(loadedDocument.document),
  );

  // Transient UI selection state (editor-only; never placed in serializable PresentationConfig)
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Keyboard shortcut listener: Escape key clears selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedColumnId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasPresentationChanges =
    presentation.rendererId !== "table" ||
    presentation.columns.some((col, idx) => {
      const defaultAlign = getDefaultAlignmentForType(col.inferredType);
      return (
        col.typeOverride !== undefined ||
        col.align !== defaultAlign ||
        !col.visible ||
        col.width !== undefined ||
        col.format !== undefined ||
        col.sourceIndex !== idx
      );
    });

  const handleResetPresentation = () => {
    setPresentation(createDefaultPresentation(loadedDocument.document));
  };

  // Find the currently selected column definition from presentation state
  const selectedColumn =
    selectedColumnId !== null
      ? (presentation.columns.find((c) => c.id === selectedColumnId) ?? null)
      : null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* 1. Top Bar / Editor Chrome */}
      <PreviewHeader
        loadedDocument={loadedDocument}
        presentation={presentation}
        onUpdatePresentation={setPresentation}
        onReset={onReset}
        onResetPresentation={handleResetPresentation}
        hasPresentationChanges={hasPresentationChanges}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* 2. Main Workspace Body: Inspector Sidebar + Design Canvas */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Persistent Inspector */}
        <ColumnInspectorSidebar
          column={selectedColumn}
          document={loadedDocument.document}
          presentation={presentation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSelectColumn={setSelectedColumnId}
          onUpdateType={(columnId, typeOverride) =>
            setPresentation((prev) => setColumnTypeOverride(prev, columnId, typeOverride))
          }
          onUpdateAlign={(columnId, align) =>
            setPresentation((prev) => setColumnAlignment(prev, columnId, align))
          }
          onUpdateVisibility={(columnId, visible) =>
            setPresentation((prev) => setColumnVisibility(prev, columnId, visible))
          }
          onUpdateWidth={(columnId, width) =>
            setPresentation((prev) => setColumnWidth(prev, columnId, width))
          }
          onUpdateFormat={(columnId, format) =>
            setPresentation((prev) => setColumnFormat(prev, columnId, format))
          }
          onResetColumn={(columnId) =>
            setPresentation((prev) => resetColumnPresentation(prev, columnId))
          }
          onUpdateDeparturesMapping={(mapping) =>
            setPresentation((prev) => setDeparturesMapping(prev, mapping))
          }
          onResetDeparturesMapping={() => setPresentation((prev) => resetDeparturesMapping(prev))}
        />

        {/* Central Design Canvas */}
        <main
          aria-label="Design Canvas"
          className="flex-1 overflow-auto bg-canvas relative flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8"
        >
          {/* Centered Renderer Surface with Breathing Room */}
          <div className="w-full max-w-6xl my-auto py-2 flex flex-col items-center">
            <section
              aria-label="CSV Preview"
              className={cn(
                "w-full",
                presentation.rendererId === "table" &&
                  "shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-xl",
              )}
            >
              <RendererHost
                document={loadedDocument.document}
                presentation={presentation}
                onUpdatePresentation={setPresentation}
                selectedColumnId={selectedColumnId}
                onSelectColumn={setSelectedColumnId}
              />
            </section>
          </div>
        </main>
      </div>

      {/* 3. Bottom Status Bar */}
      <footer className="h-8 shrink-0 border-t border-border/80 bg-surface/95 backdrop-blur-xs px-4 flex items-center justify-between text-[11px] text-muted-foreground z-20">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {presentation.rendererId === "departures" ? "Departures Board" : "Table View"}
          </span>
          <span className="hidden sm:inline font-mono">
            {presentation.rendererId === "departures"
              ? `${Math.min(12, loadedDocument.document.rowCount)} visible departures`
              : `${loadedDocument.document.rowCount.toLocaleString()} rows rendered via virtualization`}
          </span>
          {hasPresentationChanges && (
            <span className="font-medium text-accent font-mono text-[11px]">
              • Custom presentation active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/80">
          <span className="hidden md:inline">Click header to select • Esc to clear</span>
        </div>
      </footer>
    </div>
  );
}
