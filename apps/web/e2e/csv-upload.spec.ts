import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("CSV Upload and Ingestion Workflow", () => {
  test("uploads a CSV file, displays metadata and diagnostics, and allows removal", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Initial dropzone state is visible
    const dropzone = page.getByRole("button", { name: "Upload CSV or tabular file" });
    await expect(dropzone).toBeVisible();
    await expect(page.getByText("Drop your CSV here, or browse")).toBeVisible();
    await expect(page.getByText("Your file stays in your browser.")).toBeVisible();

    // 2. Select and upload file via hidden input
    const fixturePath = path.join(__dirname, "fixtures", "sample.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    // 3. Success state appears
    await expect(page.getByRole("heading", { name: "sample.csv" })).toBeVisible();
    await expect(page.getByText("Parsed successfully")).toBeVisible();
    await expect(page.getByText("Processed in browser")).toBeVisible();

    // 4. Dimensional metrics and delimiter are accurately displayed
    await expect(page.getByText("Rows", { exact: true })).toBeVisible();
    await expect(page.getByText("Columns", { exact: true })).toBeVisible();
    await expect(page.getByText("3", { exact: true })).toHaveCount(2); // 3 rows, 3 columns
    await expect(page.getByText("Comma ( , )")).toBeVisible();

    // 5. Detected headers preview is shown
    await expect(page.getByText("Detected Headers (3)")).toBeVisible();
    await expect(page.getByText("name", { exact: true })).toBeVisible();
    await expect(page.getByText("role", { exact: true })).toBeVisible();
    await expect(page.getByText("department", { exact: true })).toBeVisible();

    // 6. Clean parse state with 0 issues
    await expect(page.getByText("No parsing issues detected.")).toBeVisible();

    // 7. Remove file and reset workspace
    const removeBtn = page.getByRole("button", { name: "Remove file" });
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // 8. Dropzone returns to idle state
    await expect(dropzone).toBeVisible();
    await expect(page.getByRole("heading", { name: "sample.csv" })).not.toBeVisible();
  });

  test("dropzone is keyboard accessible with focus outline", async ({ page }) => {
    await page.goto("/");

    const dropzone = page.getByRole("button", { name: "Upload CSV or tabular file" });
    await expect(dropzone).toBeVisible();

    // Focus the dropzone element
    await dropzone.focus();
    await expect(dropzone).toBeFocused();
  });
});
