import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("deep-link details wait for the class list and distinguish failure from absence", async ({
  page,
  context,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failed = false;
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/list-for-teach/")) {
      await held;
      if (failed)
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: "{}",
        });
    }
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
  await page.goto("/#/lessons?semester=demo-current&lesson=DEMO101.01");
  await expect(
    page.locator("dialog[open] [aria-label='正在加载']"),
  ).toBeVisible();
  await expect(page.locator("dialog[open]")).not.toContainText(
    "未找到该教学班",
  );
  release();
  await expect(page.locator("dialog[open]")).toContainText("演示数学基础");
  await page.keyboard.press("Escape");
  await page.goto("/#/lessons?semester=demo-current&lesson=NOTFOUND");
  await expect(page.locator("dialog[open]")).toContainText("未找到该教学班");
  await page.keyboard.press("Escape");
  await page.goto("/#/about/data");
  await page.getByRole("button", { name: "清除查询缓存", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText("已清除");
  failed = true;
  await page.goto("/#/lessons?semester=demo-current&lesson=DEMO101.01");
  await expect(page.locator("dialog[open] [role=alert]")).toContainText(
    "HTTP 500",
  );
  await expect(page.locator("dialog[open]")).not.toContainText(
    "未找到该教学班",
  );
});
test("query cache clears across tabs and a pending old response cannot refill it", async ({
  context,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let pending = false;
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("keyword") === "DELAY") {
      pending = true;
      await held;
    }
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
  const a = await context.newPage(),
    b = await context.newPage();
  await a.goto("/#/courses?q=DEMO101");
  await expect(a.locator(".course-name").first()).toBeVisible();
  await a.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await b.goto("/#/about/data");
  await a.goto("/#/courses?q=DELAY");
  await expect.poll(() => pending).toBe(true);
  await b.getByRole("button", { name: "清除查询缓存", exact: true }).click();
  await expect(b.getByRole("status").last()).toContainText("已清除");
  release();
  await expect(a.locator(".query-loading")).toHaveCount(0);
  const count = await a.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("ustc-catalog-cache");
        open.onsuccess = () => {
          const db = open.result,
            request = db.transaction("queries").objectStore("queries").count();
          request.onsuccess = () => {
            resolve(request.result);
            db.close();
          };
        };
      }),
  );
  expect(count).toBe(0);
  await context.unroute("https://api.catalog.enthusjast.cc/**");
  await context.setOffline(true);
  await a.goto("/#/courses?q=DEMO101");
  await expect(a.getByRole("alert")).toContainText("数据暂时无法读取");
});
