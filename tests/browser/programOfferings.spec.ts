import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("program offerings load once per semester and preserve every matching class", async ({
  page,
  context,
}) => {
  let loads = 0;
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    let data = fixturePayload(
      url.pathname + url.search,
      route.request().postDataJSON() ?? undefined,
    );
    if (url.pathname.includes("/list-for-teach/")) {
      loads++;
      if (url.pathname.endsWith("demo-current")) {
        const source = (data as any[])[0];
        data = Array.from({ length: 130 }, (_, i) => ({
          ...source,
          id: `all-${i}`,
          code: `DEMO101.${String(i).padStart(3, "0")}`,
        }));
      } else data = [];
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/programs/demo-new?view=offerings&semester=demo-current");
  await expect(
    page.locator(".program-offering-course .lesson-table tbody tr"),
  ).toHaveCount(130);
  expect(loads).toBe(1);
  await expect(page.locator(".program-offering-course").last()).toContainText(
    "未找到公开开课",
  );
  await page
    .locator(".program-offering-course .candidate-button")
    .last()
    .click();
  await expect(
    page.locator(".program-offering-course .candidate-button").last(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator(".lesson-table .course-name").last().click();
  await expect(page.locator("dialog[open]")).toContainText("DEMO101.129");
  expect(page.url()).toContain("lesson=DEMO101.129");
  await page.keyboard.press("Escape");
  await page.locator("#program-module-q").fill("DEMO101");
  await expect(
    page.locator(".program-offering-course .lesson-table tbody tr"),
  ).toHaveCount(130);
  expect(loads).toBe(1);
  await page
    .locator("#program-offering-semester")
    .selectOption("demo-previous");
  await expect(page.locator(".program-offering-course")).toContainText(
    "未找到公开开课",
  );
  expect(loads).toBe(2);
});
test("failed offering query is unknown and responsive controls fit both themes", async ({
  browser,
}) => {
  for (const width of [320, 375, 768, 1440, 1920])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("catalog:theme", theme),
        theme,
      );
      await context.route(
        "https://api.catalog.enthusjast.cc/**",
        async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname.includes("/list-for-teach/") && width === 320)
            return route.abort("failed");
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(
              fixturePayload(
                url.pathname + url.search,
                route.request().postDataJSON() ?? undefined,
              ),
            ),
          });
        },
      );
      const page = await context.newPage();
      await page.goto(
        "/#/programs/demo-new?view=offerings&semester=demo-current",
      );
      if (width === 320) {
        await expect(page.locator("main")).toContainText("开课状态未知");
        await expect(page.locator("main")).not.toContainText("未找到公开开课");
      } else {
        await expect(page.locator(".lesson-table").first()).toBeVisible();
        await page.locator(".lesson-table .course-name").first().click();
        const box = await page.locator("dialog[open]").boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        await page.keyboard.press("Escape");
        await expect(
          page.locator(".lesson-table .course-name").first(),
        ).toBeFocused();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await context.close();
    }
});
