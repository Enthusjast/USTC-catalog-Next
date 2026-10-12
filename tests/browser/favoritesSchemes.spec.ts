import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("favorite groups and notes, scheme comparison and private single export", async ({
  page,
  context,
}) => {
  let modified = false;
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let data = fixturePayload(
      url.pathname + url.search,
      req.postDataJSON() ?? undefined,
    );
    if (modified && url.pathname.includes("/list-for-teach/"))
      data = (data as any[]).map((lesson) => ({
        ...lesson,
        teacherAssignmentList: [{ cn: "另一个教师" }],
      }));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/courses?q=DEMO101&course=DEMO101");
  await page.getByRole("button", { name: "收藏课程", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto("/#/courses?mode=saved");
  await page.getByRole("button", { name: "管理分组", exact: true }).click();
  await page.getByLabel("新分组", { exact: true }).fill("选修");
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(page.getByLabel("修改分组 选修", { exact: true })).toHaveValue(
    "选修",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "编辑 DEMO101 收藏分组与备注", exact: true })
    .click();
  await page
    .locator("dialog[open]")
    .getByLabel("分组", { exact: true })
    .selectOption({ label: "选修" });
  await page.getByLabel("个人备注", { exact: true }).fill("计划选修\n个人备注");
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(page.locator(".favorite-note")).toContainText("个人备注");
  await page.locator("#favorite-group-filter").selectOption({ label: "选修" });
  await expect(page.locator(".course-name").first()).toContainText(
    "演示数学基础",
  );
  expect(page.url()).not.toContain("个人备注");
  await page.goto("/#/lessons?semester=demo-current&q=DEMO101");
  await page
    .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
    .click();
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await page.locator(".scheme-name-form input").fill("副本");
  await page
    .locator(".scheme-name-form")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  modified = true;
  await page
    .getByRole("button", { name: "检查候选安排更新", exact: true })
    .click();
  await expect(page.locator(".update-preview-row")).toContainText("另一个教师");
  await page
    .getByRole("button", { name: "确认更新所选项", exact: true })
    .click();
  await page.getByRole("button", { name: "对比方案", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "同学期候选方案对比", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".scheme-stats")).toContainText("已知课程学分");
  await expect(page.locator(".scheme-change-classes")).toContainText(
    "演示教师1",
  );
  await expect(page.locator(".scheme-change-classes")).toContainText(
    "另一个教师",
  );
  await page.keyboard.press("Escape");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出当前方案", exact: true }).click();
  const download = await downloadPromise;
  const fs = await import("node:fs/promises");
  const file = JSON.parse(await fs.readFile((await download.path())!, "utf8"));
  expect(file.version).toBe(2);
  expect(file.semesters["demo-current"].schemes).toHaveLength(1);
  expect(file.favorites).toEqual([]);
  expect(file.favoriteDetails).toEqual({});
  expect(file.roomFavorites).toEqual([]);
});

test("favorite editors and scheme comparison fit five widths and both themes", async ({
  browser,
}) => {
  for (const width of [320, 375, 768, 1440, 1920])
    for (const theme of ["light", "dark"]) {
      let modified = false;
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
          let data = fixturePayload(
            url.pathname + url.search,
            route.request().postDataJSON() ?? undefined,
          );
          if (modified && url.pathname.includes("/list-for-teach/"))
            data = (data as any[]).map((lesson) => ({
              ...lesson,
              teacherAssignmentList: [{ cn: "另一个教师" }],
            }));
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        },
      );
      const page = await context.newPage();
      await page.goto("/#/courses?q=DEMO101&course=DEMO101");
      await page.getByRole("button", { name: "收藏课程", exact: true }).click();
      await page
        .getByRole("button", {
          name: "编辑 DEMO101 收藏分组与备注",
          exact: true,
        })
        .click();
      await page
        .getByLabel("个人备注", { exact: true })
        .fill("长备注".repeat(300));
      const editor = page.locator("dialog[open]").last();
      const box = await editor.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", {
          name: "编辑 DEMO101 收藏分组与备注",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await page.goto("/#/lessons?semester=demo-current&q=DEMO101");
      await page
        .getByRole("button", {
          name: "加入 演示数学基础 候选清单",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "复制", exact: true }).click();
      await page
        .locator(".scheme-name-form input")
        .fill("另一个方案".repeat(5));
      await page
        .locator(".scheme-name-form")
        .getByRole("button", { name: "保存", exact: true })
        .click();
      modified = true;
      await page
        .getByRole("button", { name: "检查候选安排更新", exact: true })
        .click();
      await expect(page.locator(".update-preview-row")).toContainText(
        "另一个教师",
      );
      await page
        .getByRole("button", { name: "确认更新所选项", exact: true })
        .click();
      await page.getByRole("button", { name: "对比方案", exact: true }).click();
      await expect(page.locator(".scheme-stats")).toBeVisible();
      await expect(page.locator(".scheme-change-classes")).toContainText(
        "另一个教师",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (width === 375)
        await page.screenshot({
          path: test.info().outputPath(`scheme-${theme}.png`),
        });
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "对比方案", exact: true }),
      ).toBeFocused();
      await context.close();
    }
});
