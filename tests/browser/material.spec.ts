import { test, expect, type BrowserContext } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
import { navigatePage, selectOption } from "./ui";

async function mockAPI(context: BrowserContext) {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        fixturePayload(
          url.pathname + url.search,
          route.request().postDataJSON() ?? undefined,
        ),
      ),
    });
  });
}

test("Material 3 controls, adaptive navigation and theme changes work at all supported widths", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  for (const width of [320, 375, 768, 1440, 1920])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await context.addInitScript(
        (value) => localStorage.setItem("catalog:theme", value),
        theme,
      );
      await mockAPI(context);
      const page = await context.newPage();
      await page.goto("/#/lessons?semester=demo-current");
      await expect(page.locator(".var-app-bar")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const mobile = width < 768;
      if (mobile)
        await page
          .getByRole("button", { name: "筛选条件", exact: true })
          .click();
      const day = page.locator("#lesson-day");
      await day.focus();
      await page.keyboard.press("Space");
      await expect(day).toHaveAttribute("aria-expanded", "true");
      const option = day.getByRole("option", { name: "周二", exact: true });
      await expect(option).toBeVisible();
      const box = (await day.locator(".var-select__scroller").boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(901);
      await option.focus();
      await page.keyboard.press("Enter");
      await expect(day).toHaveAttribute("data-value", "2");
      await expect(day).toHaveAttribute("aria-expanded", "false");
      await expect(day).toBeFocused();
      if (mobile) {
        await page
          .getByRole("button", { name: "关闭筛选", exact: true })
          .click();
        await expect(page.locator(".filter-toggle")).toBeFocused();
      }
      await expect(page.locator(".lesson-table tbody tr")).toHaveCount(2);
      const candidate = page.getByRole("button", {
        name: "加入 演示数学基础 候选清单",
        exact: true,
      });
      await candidate.click();
      await expect(
        page.getByRole("button", {
          name: "移除 演示数学基础 候选清单",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.locator(".scheme-selector .var-select__label"),
      ).toHaveText("默认方案");
      await page
        .getByRole("button", {
          name: theme === "dark" ? "切换浅色主题" : "切换深色主题",
          exact: true,
        })
        .click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme === "dark" ? "light" : "dark",
      );
      await page
        .getByRole("button", {
          name: theme === "dark" ? "切换深色主题" : "切换浅色主题",
          exact: true,
        })
        .click();
      if (width < 1024) {
        await page
          .getByRole("button", { name: "打开导航", exact: true })
          .click();
        await expect(
          page.getByRole("navigation", { name: "移动端导航", exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "打开导航", exact: true }),
        ).toBeFocused();
      } else {
        await page.getByRole("button", { name: "更多", exact: true }).click();
        await expect(
          page.getByRole("navigation", { name: "更多导航", exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "更多", exact: true }),
        ).toBeFocused();
      }
      for (const [name, path] of [
        ["lessons", "/lessons?semester=demo-current"],
        ["classrooms", "/classrooms?date=2026-10-13"],
        ["home", "/"],
      ]) {
        await navigatePage(page, path);
        await expect(page.locator(".query-loading")).toHaveCount(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        if ([375, 1440].includes(width))
          await page.screenshot({
            path: test.info().outputPath(`${name}-${width}-${theme}.png`),
            fullPage: name !== "classrooms",
          });
      }
      await context.close();
    }
});

test("Varlet selectors stay inside native dialogs and Escape restores the correct focus", async ({
  page,
  context,
}) => {
  await mockAPI(context);
  await page.goto("/#/courses?q=DEMO101&course=DEMO101");
  await page.getByRole("button", { name: "收藏课程", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto("/#/courses?mode=saved");
  const trigger = page.getByRole("button", {
    name: "编辑 DEMO101 收藏分组与备注",
    exact: true,
  });
  await trigger.click();
  const dialog = page.locator("dialog[open]");
  const field = dialog.getByRole("combobox", { name: "分组", exact: true });
  await expect(field).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    field.getByRole("option", { name: "未分组", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(field).toHaveAttribute("aria-expanded", "false");
  await expect(field).toBeFocused();
  await page
    .getByLabel("个人备注", { exact: true })
    .fill("Material 3 编辑备注");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".favorite-note")).toContainText(
    "Material 3 编辑备注",
  );
});

test("checkbox labels and search combobox keep their accessible state during updates", async ({
  page,
  context,
}) => {
  await mockAPI(context);
  await page.goto("/#/courses?q=DEMO101");
  const history = page.getByRole("checkbox", {
    name: "显示历史课程",
    exact: true,
  });
  await page
    .locator(".checkbox-label")
    .filter({ hasText: "显示历史课程" })
    .click({ position: { x: 110, y: 24 } });
  await expect(history).toBeChecked();
  await history.focus();
  await page.keyboard.press("Space");
  await expect(history).not.toBeChecked();
  await page.goto("/#/");
  const search = page.locator("#home-search");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await search.fill("DEMO101");
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(search).toHaveAttribute(
    "aria-activedescendant",
    "home-search-suggestion-0",
  );
  await page.keyboard.press("Enter");
  await expect(page.locator("dialog[open]")).toContainText("DEMO101");
  await page.keyboard.press("Escape");
  await page.goto("/#/lessons?semester=demo-current");
  await selectOption(page.locator("#lesson-day"), "2");
  await expect(page.locator(".lesson-table tbody tr")).toHaveCount(2);
});

test("selected scheme labels follow creation, rename and switching", async ({
  page,
  context,
}) => {
  await mockAPI(context);
  await page.goto("/#/lessons?semester=demo-current");
  await page
    .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
    .click();
  const schemes = page.locator(".scheme-selector");
  const selectedLabel = schemes.locator(".var-select__label");
  await expect(selectedLabel).toHaveText("默认方案");
  await schemes.getByRole("button", { name: "重命名", exact: true }).click();
  await schemes
    .getByRole("textbox", { name: "方案名称", exact: true })
    .fill("首选方案");
  await schemes.getByRole("button", { name: "保存", exact: true }).click();
  await expect(selectedLabel).toHaveText("首选方案");
  await schemes.getByRole("button", { name: "新建", exact: true }).click();
  await schemes
    .getByRole("textbox", { name: "方案名称", exact: true })
    .fill("备选方案");
  await schemes.getByRole("button", { name: "保存", exact: true }).click();
  await expect(selectedLabel).toHaveText("备选方案");
  await selectOption(schemes.getByRole("combobox"), { label: "首选方案" });
  await expect(selectedLabel).toHaveText("首选方案");
  await expect(page.locator(".planner-panel .candidate-row")).toContainText(
    "演示数学基础",
  );
});
