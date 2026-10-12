import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("home agenda loads exams on expansion and room favorites open weekly records", async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date("2026-10-13T00:00:00Z") });
  let examRequests = 0;
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let data = fixturePayload(
      url.pathname + url.search,
      req.postDataJSON() ?? undefined,
    );
    if (
      url.pathname.includes("/exam/list/") ||
      url.pathname.includes("/general-exam/list/")
    ) {
      examRequests++;
      data = (data as any[]).map((exam) => ({
        ...exam,
        examDate: "2026-10-16",
      }));
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/lessons?semester=demo-current&q=DEMO101");
  await page
    .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
    .click();
  await page.locator("#planner-start").fill("2026-08-31");
  await page.getByRole("button", { name: "周课表", exact: true }).click();
  await page.getByRole("button", { name: "跳到本周", exact: true }).click();
  await expect(page.locator("#planner-week")).toHaveValue("7");
  await page.getByRole("button", { name: "今天", exact: true }).click();
  await expect(page.locator("#timetable-mode")).toHaveValue("day");
  await page.goto("/");
  await page.locator(".home-agenda").waitFor();
  expect(examRequests).toBe(0);
  await page.locator(".home-agenda>summary").click();
  await expect(page.locator(".home-agenda")).toContainText("演示数学基础");
  await expect.poll(() => examRequests).toBe(2);
  await expect(page.locator(".home-agenda")).toContainText("2026-10-16");
  await page.goto("/#/classrooms?date=2026-10-13");
  await page.locator(".room-label").first().click();
  await page.getByRole("button", { name: "收藏教室", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已收藏教室", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("#favorite-room-jump").selectOption({ index: 1 });
  await expect(
    page.getByRole("button", { name: "本周使用", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".room-weekday")).toHaveCount(7);
  await expect(page.locator(".room-weekday").first()).toHaveText("周一");
});

test("agenda and favorite rooms fit five widths and both themes", async ({
  browser,
}) => {
  const saved = {
    version: 1,
    favorites: [],
    semesters: {
      "demo-current": {
        activeId: "one",
        schemes: [
          {
            id: "one",
            name: "默认方案",
            savedAt: "2026-10-12",
            calendar: { firstMonday: "2026-08-31", layout: "" },
            lessons: [
              {
                id: "demo-lesson-1",
                code: "DEMO101.01",
                course: { code: "DEMO101", name: "演示数学基础" },
                department: "演示学院",
                departmentCode: "DEMO",
                teachers: ["演示教师1"],
                schedule: {
                  unknown: false,
                  text: "公开安排",
                  slots: [
                    { day: 2, periods: [3, 4], weeks: [7], location: "1101" },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  };
  for (const width of [320, 375, 768, 1440, 1920])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await context.addInitScript(
        ({ saved, theme }) => {
          localStorage.setItem("catalog:theme", theme);
          if (!localStorage.getItem("agenda-seeded")) {
            localStorage.setItem("catalog:workspace", JSON.stringify(saved));
            localStorage.setItem("agenda-seeded", "1");
          }
        },
        { saved, theme },
      );
      await context.route(
        "https://api.catalog.enthusjast.cc/**",
        async (route) => {
          const req = route.request(),
            url = new URL(req.url());
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(
              fixturePayload(
                url.pathname + url.search,
                req.postDataJSON() ?? undefined,
              ),
            ),
          });
        },
      );
      const page = await context.newPage();
      await page.clock.install({ time: new Date("2026-10-13T00:00:00Z") });
      await page.goto("/");
      await page.locator(".home-agenda>summary").click();
      await expect(page.locator(".agenda-day")).toContainText("1101");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (width === 375)
        await page.screenshot({
          path: test.info().outputPath(`agenda-${theme}.png`),
        });
      await page.goto("/#/classrooms?date=2026-10-13");
      await page.locator(".room-label").first().click();
      await page.getByRole("button", { name: "收藏教室", exact: true }).click();
      await page.keyboard.press("Escape");
      await page.locator("#favorite-room-jump").waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await context.close();
    }
});
