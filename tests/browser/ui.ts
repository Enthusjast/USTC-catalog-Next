import { expect, type Locator } from "@playwright/test";

/** Select through the same Varlet menu used by mouse and touch users. */
export async function selectOption(
  field: Locator,
  selection: string | { label: string } | { index: number },
) {
  await field.click();
  const options = field.locator('[role="option"]');
  const option =
    typeof selection === "string"
      ? field.locator(`[role="option"][data-value="${selection}"]`)
      : "label" in selection
        ? field.getByRole("option", { name: selection.label, exact: true })
        : options.nth(selection.index);
  await expect(option).toBeVisible();
  await option.click();
  await expect(field).toHaveAttribute("aria-expanded", "false");
}
