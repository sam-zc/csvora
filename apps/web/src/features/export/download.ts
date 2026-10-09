import type { ExportResult } from "@csvora/export";

/**
 * Initiates a browser file download for an ExportResult using standard Blob and object URL APIs.
 *
 * Lifecycle:
 * 1. Creates a Blob with the export content and MIME type.
 * 2. Allocates a temporary object URL via URL.createObjectURL.
 * 3. Triggers simulated click on a transient invisible anchor element.
 * 4. Revokes the object URL asynchronously to prevent browser memory leaks.
 */
export function triggerBrowserDownload(result: ExportResult, customFilename?: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const filename = customFilename || result.suggestedFilename;
  const blob = new Blob([result.content], { type: result.mimeType });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Revoke object URL after a short timeout so the browser can complete the download stream
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }
}
