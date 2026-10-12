import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
async function mock(context: BrowserContext) {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        fixturePayload(
          url.pathname + url.search,
          request.postDataJSON() ?? undefined,
        ),
      ),
    });
  });
}
async function state(page: Page) {
  return page.evaluate(async () => {
    if (
      !(await indexedDB.databases()).some(
        (db) => db.name === "ustc-catalog-workspace",
      )
    )
      return undefined;
    return new Promise<any>((resolve, reject) => {
      const open = indexedDB.open("ustc-catalog-workspace");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result,
          request = db
            .transaction("workspaces")
            .objectStore("workspaces")
            .get("catalog:workspace");
        request.onsuccess = () => {
          resolve(request.result);
          db.close();
        };
      };
    });
  });
}
test("two tabs merge candidates, synchronize and reject stale scheme drafts", async ({
  context,
}) => {
  await mock(context);
  const left = await context.newPage(),
    right = await context.newPage();
  await Promise.all([
    left.goto("/#/lessons?semester=demo-current&q=DEMO101"),
    right.goto("/#/lessons?semester=demo-current&q=DEMO102"),
  ]);
  await Promise.all([
    left
      .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
      .click(),
    right
      .getByRole("button", { name: "加入 演示数值方法 候选清单", exact: true })
      .click(),
  ]);
  await expect
    .poll(
      async () =>
        (await state(left)).semesters["demo-current"].schemes[0].lessons.length,
    )
    .toBe(2);
  await expect(left.locator(".candidate-row")).toHaveCount(2);
  await expect(right.locator(".candidate-row")).toHaveCount(2);
  await left.getByRole("button", { name: "重命名", exact: true }).click();
  await left.locator(".scheme-name-form input").fill("旧草稿");
  await right.getByRole("button", { name: "重命名", exact: true }).click();
  await right.locator(".scheme-name-form input").fill("另一页名称");
  await right
    .locator(".scheme-name-form")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(left.locator(".scheme-selector option").first()).toHaveText(
    "另一页名称",
  );
  await left
    .locator(".scheme-name-form")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(left.locator(".scheme-name-form input")).toHaveValue("旧草稿");
  await expect(left.locator(".planner-panel .notice.warning")).toContainText(
    "方案已变化",
  );
  expect((await state(left)).semesters["demo-current"].schemes[0].name).toBe(
    "另一页名称",
  );
  await right.goto("/#/about/data");
  await right
    .getByRole("button", { name: "清除全部本机数据", exact: true })
    .click();
  await right.getByRole("button", { name: "确认清除", exact: true }).click();
  await expect(left.locator(".candidate-row")).toHaveCount(0);
  expect(await state(left)).toBeUndefined();
});
test("version 1 local workspace migrates once across two starting tabs", async ({
  context,
}) => {
  await mock(context);
  await context.addInitScript(() => {
    if (!localStorage.getItem("migration-test-seeded")) {
      localStorage.setItem(
        "catalog:workspace",
        JSON.stringify({ version: 1, semesters: {}, favorites: ["DEMO101"] }),
      );
      localStorage.setItem("migration-test-seeded", "1");
    }
  });
  const left = await context.newPage(),
    right = await context.newPage();
  await Promise.all([
    left.goto("/#/lessons?semester=demo-current"),
    right.goto("/#/lessons?semester=demo-current"),
  ]);
  await expect
    .poll(async () => (await state(left))?.favorites)
    .toEqual(["DEMO101"]);
  expect((await state(left)).version).toBe(2);
  expect(
    await left.evaluate(() => localStorage.getItem("catalog:workspace")),
  ).toBeNull();
});
