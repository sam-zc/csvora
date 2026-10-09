import { test } from "@playwright/test";
import path from "node:path";

test("capture desktop screenshot of Visual Editor Workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const fixturePath = path.join(__dirname, "fixtures", "financial.csv");
  const fileInput = page.locator("#csv-file-input");
  await fileInput.setInputFiles(fixturePath);

  await page.getByRole("button", { name: "Continue to preview" }).click();

  // Select the revenue column to show active selection and inspector
  const revenueHeader = page.getByRole("columnheader", { name: /revenue/i });
  await revenueHeader.click();

  // Capture screenshot of the Visual Editor Workspace
  await page.screenshot({
    path: path.join(__dirname, "screenshots", "editor-workspace-desktop.png"),
    fullPage: false,
  });
});
