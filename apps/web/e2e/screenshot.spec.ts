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

test("capture desktop screenshot of Departures Board renderer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const fixturePath = path.join(__dirname, "fixtures", "departures.csv");
  const fileInput = page.locator("#csv-file-input");
  await fileInput.setInputFiles(fixturePath);

  await page.getByRole("button", { name: "Continue to preview" }).click();

  // Switch to Departures Board renderer
  const rendererSelect = page.getByRole("combobox", { name: "Active visual renderer" });
  await rendererSelect.click();
  await page.getByRole("option", { name: "Departures Board" }).click();

  // Ensure board is fully rendered
  await page.getByRole("region", { name: "Airport Departures Display" }).waitFor();

  // Capture screenshot of the Departures Board renderer
  await page.screenshot({
    path: path.join(__dirname, "screenshots", "departures-board-desktop.png"),
    fullPage: false,
  });
});
