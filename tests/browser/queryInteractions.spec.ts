import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("module search expands nested matching paths and restores the previous collapsed state", async ({
  page,
  context,
}) => {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    let data = fixturePayload(
      url.pathname + url.search,
      route.request().postDataJSON() ?? undefined,
    );
    if (url.pathname.includes("/program/info/")) {
      const leaf = fixturePayload(
        "/teach/course-module/info/demo-common",
      ) as any;
      data = {
        ...(data as object),
        moduleTree: [
          {
            self: { id: "outer", type: "外层", courses: [] },
            isLeaf: false,
            children: [
              {
                ...leaf,
                self: {
                  ...leaf.self,
                  id: "inner",
                  type: "内层",
                  public: undefined,
                },
              },
            ],
          },
        ],
      };
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/programs/demo-new?expanded=none");
  await expect(page.locator(".program-module").first()).toHaveJSProperty(
    "open",
    false,
  );
  await page.locator("#program-module-q").fill("DEMO101");
  await expect(page.locator(".program-module").first()).toHaveJSProperty(
    "open",
    true,
  );
  await expect(page.locator(".program-module").nth(1)).toHaveJSProperty(
    "open",
    true,
  );
  await expect(
    page.getByRole("button", { name: "演示数学基础", exact: true }),
  ).toBeVisible();
  await page.locator("#program-module-q").fill("");
  await expect(page.locator(".program-module").first()).toHaveJSProperty(
    "open",
    false,
  );
});
test("dialog inner whitespace stays open in five widths and both themes", async ({
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
      await page.goto("/#/classrooms?date=2026-10-13&roomKey=directory:207");
      const dialog = page.locator("dialog[open]");
      await expect(dialog).toBeVisible();
      const box = (await dialog.boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 50);
      await expect(dialog).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await context.close();
    }
});
test("invalid shared filters are normalized without losing semester or class identifiers", async ({
  page,
  context,
}) => {
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
  await page.goto(
    "/#/lessons?semester=demo-current&week=1.5&ttDay=Infinity&view=week&source=results",
  );
  await expect(page.locator("#planner-week")).toHaveAttribute(
    "data-value",
    "1",
  );
  await expect(page.locator(".tt-block")).toHaveCount(2);
  expect(page.url()).not.toContain("1.5");
  expect(page.url()).not.toContain("Infinity");
  expect(page.url()).toContain("semester=demo-current");
  await page.goto(
    "/#/classrooms?date=2026-02-30&roomKey=directory:207&from=08:00&page=bad",
  );
  await expect(page.locator("dialog[open]")).toBeVisible();
  expect(page.url()).not.toContain("2026-02-30");
  expect(
    new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("roomKey"),
  ).toBe("directory:207");
  expect(page.url()).toContain("page=bad");
});
test("dialog whitespace and inside-to-outside dragging stay open; backdrop and Escape restore focus", async ({
  page,
  context,
}) => {
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
  await page.goto("/#/classrooms?date=2026-10-13");
  const trigger = page.locator(".room-label").first();
  await trigger.click();
  const dialog = page.locator("dialog[open]"),
    box = (await dialog.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 50);
  await expect(dialog).toBeVisible();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
  await page.mouse.down();
  await page.mouse.move(box.x - 20, 200);
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.click(box.x - 20, 200);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("offering deep links locate the matching class page, and clearing search restores collapsed courses", async ({
  page,
  context,
}) => {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    let data = fixturePayload(
      url.pathname + url.search,
      route.request().postDataJSON() ?? undefined,
    );
    if (url.pathname.includes("/list-for-teach/")) {
      const base = (data as any[])[0];
      data = Array.from({ length: 130 }, (_, i) => ({
        ...base,
        id: `all-${i}`,
        code: `DEMO101.${String(i).padStart(3, "0")}`,
      }));
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto(
    "/#/programs/demo-new?view=offerings&semester=demo-current&lesson=DEMO101.129",
  );
  await expect(page.locator("dialog[open]")).toContainText("DEMO101.129");
  await page.keyboard.press("Escape");
  await expect(page.locator(".lesson-table .course-code").last()).toHaveText(
    "DEMO101.129",
  );
  await page.getByRole("button", { name: "全部收起", exact: true }).click();
  await expect(page.locator(".lesson-table")).toHaveCount(0);
  await page.locator("#program-module-q").fill("DEMO101");
  await expect(page.locator(".lesson-table")).toHaveCount(1);
  await page.locator("#program-module-q").fill("");
  await expect(page.locator(".lesson-table")).toHaveCount(0);
  await page.getByRole("button", { name: "全部展开", exact: true }).click();
  await expect(page.locator(".lesson-table")).toHaveCount(1);
});
