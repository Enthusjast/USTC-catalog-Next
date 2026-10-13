import { expect, type Locator, type Page } from "@playwright/test";

/** Hash navigation finishes before Vue has rendered the destination. */
export async function navigatePage(page: Page, path: string) {
  const pathname = path.split("?")[0] ?? "/";
  const titles: Record<string, string> = {
    "/": "公共查询工作台",
    "/courses": "课程目录",
    "/programs": "培养方案",
    "/program-compare": "计划对比",
    "/lessons": "全校教学班",
    "/exams": "考试查询",
    "/classrooms": "教室使用",
    "/substitutions": "替代课程",
    "/archives": "历史归档",
    "/about/data": "站点说明",
    "/search": "全站搜索",
  };
  const title = pathname.startsWith("/programs/")
    ? "计划详情"
    : pathname.startsWith("/archives/")
      ? "历史方案正文"
      : (titles[pathname] ?? "页面不存在");
  await page.goto(`/#${path}`);
  await expect(page).toHaveTitle(`${title} · USTC-catalog-Next`);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await expect(page.locator(".query-loading, .room-query-loading")).toHaveCount(
    0,
  );
}

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
