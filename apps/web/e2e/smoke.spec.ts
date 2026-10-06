import { test, expect } from "@playwright/test";

test.describe("CSVora smoke test", () => {
  test("loads the application shell and shows CSVora heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "CSVora", level: 1 })).toBeVisible();
    await expect(page.getByText("Turn raw CSV data into beautiful tables.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeVisible();
  });
});
