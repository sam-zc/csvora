import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

test.describe("CSV Export Pipeline Flow", () => {
  test("uploads financial.csv, formats revenue as INR, hides status, exports Formatted CSV, Raw CSV, and Markdown", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Upload financial.csv fixture
    const fixturePath = path.join(__dirname, "fixtures", "financial.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    // 2. Navigate to preview workspace
    await expect(page.getByRole("heading", { name: "financial.csv" })).toBeVisible();
    await page.getByRole("button", { name: "Continue to preview" }).click();

    // Verify workspace is loaded
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "revenue" })).toBeVisible();

    // 3. Format revenue column as INR currency
    const inspectRevenueBtn = page.getByRole("button", { name: "Inspect column revenue" });
    await expect(inspectRevenueBtn).toBeVisible();
    await inspectRevenueBtn.click();

    const formatTrigger = page.getByRole("combobox", {
      name: "Number format for column revenue",
    });
    await expect(formatTrigger).toBeVisible();
    await formatTrigger.click();

    const inrOption = page.getByRole("option", { name: "Currency (INR ₹)" });
    await expect(inrOption).toBeVisible();
    await inrOption.click();

    // Verify cell displays formatted INR
    await expect(page.getByRole("cell", { name: "₹45,000" })).toBeVisible();

    // 4. Hide status column via Column Manager
    const manageColumnsBtn = page.getByRole("button", { name: "Manage columns" });
    await expect(manageColumnsBtn).toBeVisible();
    await manageColumnsBtn.click();

    const hideStatusBtn = page.getByRole("button", { name: "Hide status" });
    await expect(hideStatusBtn).toBeVisible();
    await hideStatusBtn.click();

    // Close popover
    await page.keyboard.press("Escape");
    await expect(page.getByRole("columnheader", { name: "status" })).not.toBeVisible();

    // 5. Open Export menu
    const exportBtn = page.getByRole("button", { name: "Export document" });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify export popover items
    await expect(page.getByText("Export Dataset")).toBeVisible();
    await expect(page.locator("#export-formatted-csv")).toBeVisible();
    await expect(page.locator("#export-raw-csv")).toBeVisible();
    await expect(page.locator("#export-markdown")).toBeVisible();
    await expect(page.locator("#export-raw-json")).toBeVisible();

    // 6. Download Formatted CSV and verify content
    const formattedDownloadPromise = page.waitForEvent("download");
    await page.locator("#export-formatted-csv").click();
    const formattedDownload = await formattedDownloadPromise;

    expect(formattedDownload.suggestedFilename()).toBe("financial-formatted.csv");
    const formattedPath = await formattedDownload.path();
    expect(formattedPath).toBeTruthy();
    if (formattedPath) {
      const formattedContent = await fs.readFile(formattedPath, "utf-8");

      // Verify hidden column 'status' is omitted
      expect(formattedContent).not.toContain("status");
      expect(formattedContent).not.toContain("PAID");

      // Verify header order: date, category, revenue
      expect(formattedContent.startsWith("date,category,revenue\r\n")).toBe(true);

      // Verify formatted INR currency value
      expect(formattedContent).toContain('"₹45,000"');
      expect(formattedContent).toContain('"₹12,500"');
      expect(formattedContent).toContain('"₹8,200"');
    }

    // 7. Download Raw CSV and verify original source values remain untouched
    await exportBtn.click();
    const rawDownloadPromise = page.waitForEvent("download");
    await page.locator("#export-raw-csv").click();
    const rawDownload = await rawDownloadPromise;

    expect(rawDownload.suggestedFilename()).toBe("financial.csv");
    const rawPath = await rawDownload.path();
    expect(rawPath).toBeTruthy();
    if (rawPath) {
      const rawContent = await fs.readFile(rawPath, "utf-8");

      // Verify all source columns present including hidden 'status'
      expect(rawContent.startsWith("date,category,revenue,status\r\n")).toBe(true);
      expect(rawContent).toContain("PAID");
      expect(rawContent).toContain("PENDING");

      // Verify raw numbers remain unformatted
      expect(rawContent).toContain("45000");
      expect(rawContent).toContain("12500");
      expect(rawContent).toContain("8200");
      expect(rawContent).not.toContain("₹");
    }

    // 8. Download Markdown Table and verify alignment & formatting
    await exportBtn.click();
    const mdDownloadPromise = page.waitForEvent("download");
    await page.locator("#export-markdown").click();
    const mdDownload = await mdDownloadPromise;

    expect(mdDownload.suggestedFilename()).toBe("financial.md");
    const mdPath = await mdDownload.path();
    expect(mdPath).toBeTruthy();
    if (mdPath) {
      const mdContent = await fs.readFile(mdPath, "utf-8");

      // Verify Markdown headers and hidden column excluded
      expect(mdContent).toContain("| date | category | revenue |");
      expect(mdContent).not.toContain("status");

      // Verify alignment row
      expect(mdContent).toContain("| :--- | :--- | ---: |");

      // Verify formatted currency in markdown cell
      expect(mdContent).toContain("₹45,000");
    }
  });
});
