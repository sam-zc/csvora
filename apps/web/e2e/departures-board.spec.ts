import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("Airport Departures Board Renderer", () => {
  test("uploads departures.csv, switches renderer, verifies departures visual display, tests two-way switcher and manual remapping", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // 1. Initial dropzone
    const dropzone = page.getByRole("button", { name: "Upload CSV or tabular file" });
    await expect(dropzone).toBeVisible();

    // 2. Upload departures.csv fixture
    const fixturePath = path.join(__dirname, "fixtures", "departures.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    // 3. Summary screen & Continue to editor
    await expect(page.getByRole("heading", { name: "departures.csv" })).toBeVisible();
    const continueBtn = page.getByRole("button", { name: "Continue to preview" });
    await continueBtn.click();

    // 4. Verify Default Table initially
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Table View", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Frankfurt" })).toBeVisible();

    // 5. Switch Renderer to Departures Board
    const rendererSelect = page.getByRole("combobox", { name: "Active visual renderer" });
    await expect(rendererSelect).toBeVisible();
    await rendererSelect.click();
    await page.getByRole("option", { name: "Departures Board" }).click();

    // 6. Verify Departures Board renderer is visible
    const board = page.getByRole("region", { name: "Airport Departures Display" });
    await expect(board).toBeVisible();
    await expect(board.getByText("DEPARTURES", { exact: true })).toBeVisible();
    await expect(board.getByText("PARTIDAS · DÉPARTS · ABFLUG")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Departures Board" })).toBeVisible();

    // 7. Verify auto-mapped columns in sidebar inspector
    const timeMapping = page.getByRole("combobox", { name: "Map Time column" });
    const flightMapping = page.getByRole("combobox", { name: "Map Flight column" });
    const destMapping = page.getByRole("combobox", { name: "Map Destination column" });
    const gateMapping = page.getByRole("combobox", { name: "Map Gate column" });
    const statusMapping = page.getByRole("combobox", { name: /map status/i });

    await expect(timeMapping).toContainText("time");
    await expect(flightMapping).toContainText("flight");
    await expect(destMapping).toContainText("destination");
    await expect(gateMapping).toContainText("gate");
    await expect(statusMapping).toContainText("delay");

    // 8. Verify core flight departure values (08:15, LH 441, FRANKFURT, B07)
    await expect(page.getByLabel(/08:15 LH 441 to FRANKFURT/i)).toBeVisible();

    // 9. Verify DELAYED +25 (BA 117 to London)
    await expect(
      page.getByLabel(/08:30 BA 117 to LONDON, Gate A12, Status: DELAYED \+25/i),
    ).toBeVisible();

    // 10. Verify CANCELLED (KL 1786 to Amsterdam with empty delay)
    await expect(
      page.getByLabel(/09:05 KL 1786 to AMSTERDAM, Gate B11, Status: CANCELLED/i),
    ).toBeVisible();

    // 11. Verify EARLY (IB 3171 to Madrid with -5 delay)
    await expect(
      page.getByLabel(/09:20 IB 3171 to MADRID, Gate A04, Status: EARLY/i),
    ).toBeVisible();

    // Verify row count footer
    await expect(page.getByText("Showing 7 of 7 departures")).toBeVisible();

    // 12. Switch back to Table
    await rendererSelect.click();
    await page.getByRole("option", { name: "Table" }).click();

    // 13. Verify Table still functions cleanly
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Table View", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Frankfurt" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Madrid" })).toBeVisible();

    // 14. Switch to Departures again
    await rendererSelect.click();
    await page.getByRole("option", { name: "Departures Board" }).click();

    // 15. Verify Departures Board is restored and mappings remain
    await expect(board).toBeVisible();
    await expect(timeMapping).toContainText("time");
    await expect(destMapping).toContainText("destination");

    // 16. Change one mapping manually (map Destination to gate column)
    await destMapping.click();
    await page.getByRole("option", { name: "gate", exact: true }).click();

    // 17. Verify board updates with new destination mapping
    await expect(destMapping).toContainText("gate");
    // Row 1 destination now reflects B07 instead of FRANKFURT
    await expect(page.getByLabel(/08:15 LH 441 to B07/i)).toBeVisible();

    // 18. Reset mappings restores automatic destination mapping
    const resetMappingsBtn = page.getByRole("button", { name: "Reset mappings" });
    await expect(resetMappingsBtn).toBeVisible();
    await resetMappingsBtn.click();

    await expect(destMapping).toContainText("destination");
    await expect(page.getByLabel(/08:15 LH 441 to FRANKFURT/i)).toBeVisible();
  });
});
