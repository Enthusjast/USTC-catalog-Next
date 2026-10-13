import { selectOption } from "./ui";
import { test, expect, type BrowserContext } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fixturePayload } from "../../src/api/fixtures";

async function mockAPI(context: BrowserContext) {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    try {
      const data = fixturePayload(
        url.pathname + url.search,
        request.postDataJSON() ?? undefined,
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    } catch {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: '{"error":"not_found"}',
      });
    }
  });
}

test("offline restart, all route code, uncached queries and separate data clearing", async ({
  page,
  context,
}) => {
  await mockAPI(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/courses?q=DEMO101");
  await expect(page.locator(".course-name").first()).toContainText(
    "演示数学基础",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.goto("/#/lessons?semester=demo-current");
  await page
    .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
    .click();
  await page.locator("#planner-start").fill("2026-08-31");
  await selectOption(page.locator("#planner-layout"), "1");
  const saved = await page.evaluate(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open("ustc-catalog-workspace");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            request = db
              .transaction("workspaces")
              .objectStore("workspaces")
              .get("catalog:workspace");
          request.onsuccess = () => {
            resolve(request.result ? JSON.stringify(request.result) : null);
            db.close();
          };
        };
      }),
  );
  expect(saved).toBeTruthy();
  await context.unroute("https://api.catalog.enthusjast.cc/**");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "移除 演示数学基础 候选清单",
      exact: true,
    }),
  ).toBeVisible();
  // This route's code was not opened before disconnecting.
  await page.goto("/#/about/data");
  await expect(
    page.getByRole("heading", { name: "安装与离线使用", exact: true }),
  ).toBeVisible();
  await page.goto("/#/courses?q=DEMO101");
  await expect(page.locator(".course-name").first()).toContainText(
    "演示数学基础",
  );
  await page.goto("/#/courses?q=UNCACHED");
  await expect(page.getByRole("alert")).toContainText("数据暂时无法读取");
  await page.goto("/#/classrooms?date=2026-10-11");
  await expect(page.locator(".room-label")).toHaveCount(258);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const cachedURLs = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys())
      for (const request of await (await caches.open(key)).keys())
        urls.push(request.url);
    return urls;
  });
  expect(cachedURLs.some((url) => url.includes("api.catalog"))).toBe(false);
  expect(
    cachedURLs.some(
      (url) => url.includes("LessonsPage-") && url.endsWith(".js"),
    ),
  ).toBe(true);
  await page.goto("/#/about/data");
  await page.getByRole("button", { name: "清除查询缓存", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText(
    "方案和收藏已保留",
  );
  expect(
    await page.evaluate(
      () =>
        new Promise<string | null>((resolve, reject) => {
          const open = indexedDB.open("ustc-catalog-workspace");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result,
              request = db
                .transaction("workspaces")
                .objectStore("workspaces")
                .get("catalog:workspace");
            request.onsuccess = () => {
              resolve(request.result ? JSON.stringify(request.result) : null);
              db.close();
            };
          };
        }),
    ),
  ).toBe(saved);
  await page.evaluate(() => {
    localStorage.setItem("catalog:planner", "{}");
    localStorage.setItem("catalog:demo:favorites", '["DEMO101"]');
    sessionStorage.setItem("catalog:classroom-positions", "[]");
  });
  await page
    .getByRole("button", { name: "清除全部本机数据", exact: true })
    .click();
  await page.getByRole("button", { name: "确认清除", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText("全部本机");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("catalog:")),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.startsWith("catalog:")),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("new worker waits for a click and preserves local workspace", async ({
  page,
  context,
}) => {
  await mockAPI(context);
  await page.goto("/#/lessons?semester=demo-current");
  await page
    .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
    .click();
  await page.locator("#planner-start").fill("2026-08-31");
  await selectOption(page.locator("#planner-layout"), "1");
  await page.goto("/#/courses?q=DEMO101&course=DEMO101");
  await page.getByRole("button", { name: "收藏课程", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto("/#/courses?mode=saved");
  await page.getByRole("button", { name: "管理分组", exact: true }).click();
  await page.getByLabel("新分组", { exact: true }).fill("离线分组");
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(
    page.getByLabel("修改分组 离线分组", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "编辑 DEMO101 收藏分组与备注", exact: true })
    .click();
  await selectOption(
    page.locator("dialog[open]").getByLabel("分组", { exact: true }),
    { label: "离线分组" },
  );
  await page
    .getByLabel("个人备注", { exact: true })
    .fill("更新后保留的私人备注");
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await page.goto("/#/classrooms?date=2026-10-13");
  await page.locator(".room-label").first().click();
  await page.getByRole("button", { name: "收藏教室", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto("/#/lessons?semester=demo-current");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const saved = await page.evaluate(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open("ustc-catalog-workspace");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            request = db
              .transaction("workspaces")
              .objectStore("workspaces")
              .get("catalog:workspace");
          request.onsuccess = () => {
            resolve(request.result ? JSON.stringify(request.result) : null);
            db.close();
          };
        };
      }),
  );
  expect(JSON.parse(saved!).favorites).toEqual(["DEMO101"]);
  expect(JSON.parse(saved!).favoriteDetails.DEMO101.note).toBe(
    "更新后保留的私人备注",
  );
  expect(JSON.parse(saved!).favoriteGroups[0].name).toBe("离线分组");
  expect(JSON.parse(saved!).roomFavorites).toHaveLength(1);
  const worker = await readFile("dist/sw.js", "utf8"),
    offline = await readFile("dist/offline.html", "utf8");
  const nextOffline = offline + "\n<!-- browser update regression -->\n";
  const revision = createHash("md5").update(nextOffline).digest("hex");
  const nextWorker = worker.replace(
    /(url:"offline.html",revision:")[^"]+/g,
    `$1${revision}`,
  );
  expect(nextWorker).not.toBe(worker);
  try {
    await writeFile("dist/offline.html", nextOffline);
    await writeFile("dist/sw.js", nextWorker);
    let reloads = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) reloads++;
    });
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect(
      page
        .locator(".pwa-update")
        .getByRole("button", { name: "更新应用", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(250);
    expect(reloads).toBe(0);
    const navigation = page.waitForNavigation({ waitUntil: "networkidle" });
    await page
      .locator(".pwa-update")
      .getByRole("button", { name: "更新应用", exact: true })
      .click();
    await navigation;
    await expect.poll(() => reloads).toBeGreaterThan(0);
    await expect(
      page.getByRole("button", {
        name: "移除 演示数学基础 候选清单",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          new Promise<string | null>((resolve, reject) => {
            const open = indexedDB.open("ustc-catalog-workspace");
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result,
                request = db
                  .transaction("workspaces")
                  .objectStore("workspaces")
                  .get("catalog:workspace");
              request.onsuccess = () => {
                resolve(request.result ? JSON.stringify(request.result) : null);
                db.close();
              };
            };
          }),
      ),
    ).toBe(saved);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await context.setOffline(true);
    await context.unroute("https://api.catalog.enthusjast.cc/**");
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "移除 演示数学基础 候选清单",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await writeFile("dist/offline.html", offline);
    await writeFile("dist/sw.js", worker);
  }
});

test("all pages at five widths in both themes", async ({ browser }) => {
  const paths = [
    "/",
    "/courses?q=DEMO101",
    "/programs",
    "/programs/demo-new?view=terms",
    "/program-compare",
    "/lessons?semester=demo-current",
    "/lessons?semester=demo-current&view=week&source=results",
    "/exams?semester=demo-current",
    "/classrooms?date=2026-10-11",
    "/substitutions",
    "/archives",
    "/archives/001",
    "/about/data",
    "/search?q=DEMO101",
  ];
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
      const page = await context.newPage(),
        errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const path of paths) {
        await page.goto(`/#${path}`);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator(".query-loading")).toHaveCount(0);
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
            { message: `${path}: ${width}px ${theme}` },
          )
          .toBe(true);
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(
          page.locator("h1").first(),
          `${path}: ${width}px ${theme} heading contrast`,
        ).toHaveCSS(
          "color",
          theme === "dark" ? "rgb(227, 228, 232)" : "rgb(25, 27, 31)",
        );
      }
      expect(errors).toEqual([]);
      if (width === 375)
        await page.screenshot({
          path: test.info().outputPath(`mobile-${theme}.png`),
          fullPage: true,
        });
      await context.close();
    }
});
