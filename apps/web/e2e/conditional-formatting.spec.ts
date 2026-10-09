import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("Conditional Formatting & Semantic Visual Rules", () => {
  test("creates value-based conditional rules, verifies semantic cell treatments, tests reordering and state retention", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // 1. Upload conditional.csv fixture
    const dropzone = page.getByRole("button", { name: "Upload CSV or tabular file" });
    await expect(dropzone).toBeVisible();

    const fixturePath = path.join(__dirname, "fixtures", "conditional.csv");
    const fileInput = page.locator("#csv-file-input");
    await fileInput.setInputFiles(fixturePath);

    // 2. Summary screen & Continue to editor
    await expect(page.getByRole("heading", { name: "conditional.csv" })).toBeVisible();
    const continueBtn = page.getByRole("button", { name: "Continue to preview" });
    await continueBtn.click();

    // 3. Verify editor preview table is visible
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Table View", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "120000" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "-15000" })).toBeVisible();

    // 4. Select the Revenue column
    const revenueHeader = page.getByRole("columnheader", { name: "revenue" });
    await revenueHeader.click();

    // Verify Inspector opened for Revenue
    await expect(page.getByRole("heading", { name: "revenue" })).toBeVisible();

    // 5. Add Rule 1 on Revenue: Less than 0 -> Danger
    const addRuleBtn = page.getByRole("button", { name: /add (first )?rule/i });
    await addRuleBtn.click();

    // Configure operator to "Less than (<)"
    const operatorSelect = page.getByRole("combobox", { name: /operator for rule 1/i });
    await operatorSelect.click();
    await page.getByRole("option", { name: "Less than (<)" }).click();

    // Configure value input to "0"
    const valueInput = page.getByRole("spinbutton", { name: /value for rule 1/i });
    await valueInput.fill("0");

    // Configure intent to "Danger"
    const intentSelect = page.getByRole("combobox", { name: /intent for rule 1/i });
    await intentSelect.click();
    await page.getByRole("option", { name: "Danger" }).click();

    // 6. Verify table immediately reflects the rule without manual save
    const dangerCell = page.locator('td[data-intent="danger"]').filter({ hasText: "-15000" });
    await expect(dangerCell).toBeVisible();

    // Neutral cell remains unaffected
    const positiveCell = page.locator("td").filter({ hasText: "120000" });
    await expect(positiveCell).not.toHaveAttribute("data-intent", "danger");

    // 7. Add Rule 2 on Revenue: Greater than 100000 -> Success
    const addSecondRuleBtn = page.getByRole("button", { name: /add (conditional )?rule/i });
    await addSecondRuleBtn.click();

    // Value input for Rule 2: 100000
    const rule2ValueInput = page.getByRole("spinbutton", { name: /value for rule 2/i });
    await rule2ValueInput.fill("100000");

    // Intent is Success by default for number > rule
    // Verify 120000 receives success treatment
    const successCell = page.locator('td[data-intent="success"]').filter({ hasText: "120000" });
    await expect(successCell).toBeVisible();

    // 8. Reorder rules using Move Up
    const moveUpBtn = page.getByRole("button", { name: /move rule 2 up/i });
    await moveUpBtn.click();

    // 9. Switch selection to Status column
    const statusHeader = page.getByRole("columnheader", { name: "status" });
    await statusHeader.click();
    await expect(page.getByRole("heading", { name: "status" })).toBeVisible();

    // 10. Add rule on Status: Contains "Delayed" -> Warning
    const addStatusRuleBtn = page.getByRole("button", { name: /add (first )?rule/i });
    await addStatusRuleBtn.click();

    // Value input for Status Rule 1: Delayed
    const statusValueInput = page.getByRole("textbox", { name: /value for rule 1/i });
    await statusValueInput.fill("Delayed");

    // Intent: Warning
    const statusIntentSelect = page.getByRole("combobox", { name: /intent for rule 1/i });
    await statusIntentSelect.click();
    await page.getByRole("option", { name: "Warning" }).click();

    // Verify Delayed cell receives warning treatment
    const warningCell = page.locator('td[data-intent="warning"]').filter({ hasText: "Delayed" });
    await expect(warningCell).toBeVisible();

    // 11. Test Column Hide/Show Retention
    const hideBtn = page.getByRole("button", { name: /hide column status/i });
    await hideBtn.click();
    await expect(page.getByRole("columnheader", { name: "status" })).not.toBeVisible();

    const showBtn = page.getByRole("button", { name: /show column status/i });
    await showBtn.click();
    await expect(page.getByRole("columnheader", { name: "status" })).toBeVisible();
    await expect(warningCell).toBeVisible();

    // 12. Switch renderer to Departures and back to Table View
    const rendererSelect = page.getByRole("combobox", { name: "Active visual renderer" });
    await rendererSelect.click();
    await page.getByRole("option", { name: "Departures Board" }).click();

    // Switch back to Table View
    await rendererSelect.click();
    await page.getByRole("option", { name: "Table" }).click();

    // 13. Verify conditional rules remain active and intact
    await expect(
      page.locator('td[data-intent="danger"]').filter({ hasText: "-15000" }),
    ).toBeVisible();
    await expect(
      page.locator('td[data-intent="success"]').filter({ hasText: "120000" }),
    ).toBeVisible();
    await expect(
      page.locator('td[data-intent="warning"]').filter({ hasText: "Delayed" }),
    ).toBeVisible();
  });
});
