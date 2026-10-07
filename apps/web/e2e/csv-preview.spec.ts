import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

test.describe("CSV Preview Workspace and Default Table Renderer", () => {
  test("uploads sample.csv, navigates to preview workspace, verifies table layout, and returns cleanly to uploader", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Initial uploader dropzone
    const dropzone = page.getByRole("button", { name: "Upload CSV or tabular file" });
    await expect(dropzone).toBeVisible();

    // 2. Upload sample.csv
    const fixturePath = path.join(__dirname, "fixtures", "sample.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    // 3. File Summary appears
    await expect(page.getByRole("heading", { name: "sample.csv" })).toBeVisible();
    const continueBtn = page.getByRole("button", { name: "Continue to preview" });
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeEnabled();

    // 4. Click Continue to preview
    await continueBtn.click();

    // 5. Preview workspace appears
    await expect(page.getByRole("heading", { name: "sample.csv" })).toBeVisible();
    await expect(page.getByText("Table View", { exact: true })).toBeVisible();
    await expect(page.getByText("3 rows rendered via virtualization")).toBeVisible();

    // 6. Header cells are visible and semantically defined
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "role" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "department" })).toBeVisible();

    // 7. Data rows and cell values appear
    await expect(page.getByRole("cell", { name: "Alice" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Engineer" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Platform" })).toBeVisible();

    await expect(page.getByRole("cell", { name: "Bob" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Designer" })).toBeVisible();

    await expect(page.getByRole("cell", { name: "Charlie" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Lead" })).toBeVisible();

    // 8. Change file returns cleanly to dropzone
    const changeFileBtn = page.getByRole("button", {
      name: "Change CSV file and return to upload",
    });
    await expect(changeFileBtn).toBeVisible();
    await changeFileBtn.click();

    // 9. Dropzone is back and active
    await expect(dropzone).toBeVisible();
    await expect(page.getByRole("table")).not.toBeVisible();
  });

  test("renders irregular CSV with duplicate headers, empty header, and uneven rows safely", async ({
    page,
  }) => {
    await page.goto("/");

    const fixturePath = path.join(__dirname, "fixtures", "irregular.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    // Summary screen shows diagnostics warnings
    await expect(page.getByRole("heading", { name: "irregular.csv" })).toBeVisible();
    await expect(page.getByText("4 Warnings")).toBeVisible();

    // Navigate to preview
    await page.getByRole("button", { name: "Continue to preview" }).click();

    // Table renders
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Duplicate headers are both rendered as distinct column headers
    const nameHeaders = page.getByRole("columnheader", { name: "name" });
    await expect(nameHeaders).toHaveCount(2);

    // Empty header renders fallback label Column 3
    await expect(page.getByRole("columnheader", { name: "Column 3" })).toBeVisible();

    // Score header
    await expect(page.getByRole("columnheader", { name: "score" })).toBeVisible();

    // Malformed rows display warning indicators
    const malformedWarnings = page.getByLabel(/Row has (missing|extra) fields/i);
    await expect(malformedWarnings).toHaveCount(2);

    // Check that numeric column score is right-aligned
    const scoreCell = page.getByRole("cell", { name: "98" });
    await expect(scoreCell).toBeVisible();
    await expect(scoreCell).toHaveClass(/text-right/);

    // Expand diagnostics in preview header
    const warningBadge = page.getByRole("button", { name: /warnings/i });
    await expect(warningBadge).toBeVisible();
    await warningBadge.click();
    await expect(page.getByText("Formatting warnings recorded (data preserved)")).toBeVisible();
  });

  test("allows inspecting column, seeing detected type, overriding type and alignment, and resetting", async ({
    page,
  }) => {
    await page.goto("/");

    const fixturePath = path.join(__dirname, "fixtures", "irregular.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    await page.getByRole("button", { name: "Continue to preview" }).click();

    // 1. Open score column inspector
    const inspectScoreBtn = page.getByRole("button", { name: "Inspect column score" });
    await expect(inspectScoreBtn).toBeVisible();
    await inspectScoreBtn.click();

    // 2. Verify detected type
    await expect(page.getByRole("heading", { name: "score" })).toBeVisible();
    await expect(page.getByText("Detected Type")).toBeVisible();
    await expect(page.getByText("number").first()).toBeVisible();
    await expect(page.getByText("Effective: NUMBER")).toBeVisible();

    // 3. Verify data profile
    await expect(page.getByText("Non-empty:")).toBeVisible();

    // 4. Override display type to String
    const typeSelect = page.getByRole("combobox", { name: "Display type for column score" });
    await typeSelect.click();
    await page.getByRole("option", { name: "String (text)" }).click();
    await expect(page.getByText("Override active")).toBeVisible();

    // 5. Change alignment to Center
    const centerAlignBtn = page.getByRole("radio", { name: "center" });
    await centerAlignBtn.click();

    // 6. Verify table cell reflects centered alignment
    const scoreCell = page.getByRole("cell", { name: "98" });
    await expect(scoreCell).toBeVisible();
    await expect(scoreCell).toHaveClass(/text-center/);

    // Verify raw content is preserved
    await expect(scoreCell).toHaveText("98");

    // 7. Reset column to defaults
    const resetColBtn = page.getByRole("button", { name: "Reset", exact: true });
    await expect(resetColBtn).toBeEnabled();
    await resetColBtn.click();

    // 8. Verify table cell returns to right alignment
    await expect(scoreCell).toHaveClass(/text-right/);

    // 9. Close inspector using Escape
    await page.keyboard.press("Escape");
    await expect(page.getByText("Detected Type")).not.toBeVisible();

    // 10. Change file returns cleanly to dropzone
    const changeFileBtn = page.getByRole("button", {
      name: "Change CSV file and return to upload",
    });
    await expect(changeFileBtn).toBeVisible();
    await changeFileBtn.click();

    const dropzone = page.getByRole("button", { name: "Upload CSV or tabular file" });
    await expect(dropzone).toBeVisible();
  });

  test("supports independent column inspection and overrides for duplicate headers", async ({
    page,
  }) => {
    await page.goto("/");

    const fixturePath = path.join(__dirname, "fixtures", "irregular.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    await page.getByRole("button", { name: "Continue to preview" }).click();

    // Inspect buttons for both duplicate "name" headers
    const inspectButtons = page.getByRole("button", { name: "Inspect column name" });
    await expect(inspectButtons).toHaveCount(2);

    // Open inspector for the first name column (col_0)
    await inspectButtons.nth(0).click();
    await expect(page.getByText("col_0")).toBeVisible();

    // Change first column alignment to center
    await page.getByRole("radio", { name: "center" }).click();
    await page.keyboard.press("Escape");

    // Check first column's data cell is centered, while second column's data cell remains left-aligned
    const firstColCell = page.getByRole("cell", { name: "Alice" });
    const secondColCell = page.getByRole("cell", { name: "Worker" });

    await expect(firstColCell).toHaveClass(/text-center/);
    await expect(secondColCell).not.toHaveClass(/text-center/);

    // Reset columns button should now be visible in preview header
    const resetColumnsBtn = page.getByRole("button", {
      name: "Reset all columns to default inferred presentation",
    });
    await expect(resetColumnsBtn).toBeVisible();
    await resetColumnsBtn.click();

    // After resetting all columns, first column returns to default left alignment
    await expect(firstColCell).not.toHaveClass(/text-center/);
    await expect(resetColumnsBtn).not.toBeVisible();
  });

  test("efficiently virtualizes large CSV datasets without rendering all rows in DOM", async ({
    page,
  }) => {
    // Generate a temporary 600-row CSV file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `csvora-large-test-${Date.now()}.csv`);
    const lines = ["id,first_name,last_name,email,score"];
    for (let i = 1; i <= 600; i++) {
      lines.push(`${i},User${i},LastName${i},user${i}@example.com,${(i * 13) % 100}`);
    }
    fs.writeFileSync(tempFilePath, lines.join("\n"), "utf-8");

    try {
      await page.goto("/");

      const fileInput = page.locator("#csv-file-input");
      await fileInput.setInputFiles(tempFilePath);

      // Check summary
      await expect(page.getByText("600", { exact: true })).toBeVisible(); // 600 rows
      await page.getByRole("button", { name: "Continue to preview" }).click();

      // Table is rendered
      await expect(page.getByText("600 rows rendered via virtualization")).toBeVisible();

      // First few rows are visible
      await expect(page.getByRole("cell", { name: "User1", exact: true })).toBeVisible();

      // Virtualization check: the total number of rendered rows in the DOM should be much smaller than 600
      const renderedTrCount = await page.locator("tbody tr[data-index]").count();
      expect(renderedTrCount).toBeLessThan(100);
      expect(renderedTrCount).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });
});
