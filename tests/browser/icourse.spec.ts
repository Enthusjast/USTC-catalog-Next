import { test, expect, type BrowserContext } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
const records = [
  {
    name: "单变量微积分",
    teachers: ["李娟"],
    href: "https://www.icourse.club/course/1208/",
  },
  {
    name: "单变量微积分",
    teachers: ["未收录教师"],
    href:
      "https://www.icourse.club/search/?q=" +
      encodeURIComponent("单变量微积分"),
  },
  {
    name: "单变量微积分",
    teachers: [],
    href:
      "https://www.icourse.club/search/?q=" +
      encodeURIComponent("单变量微积分"),
  },
  {
    name: "时间序列分析",
    teachers: ["刘杰"],
    href:
      "https://www.icourse.club/search/?q=" +
      encodeURIComponent("时间序列分析"),
  },
  {
    name: "仪器分析实验",
    teachers: [
      "李维维",
      "邵伟",
      "盛翔",
      "杨凯平",
      "胡万群",
      "张万群",
      "柯玉萍",
      "孙晴",
      "孙晴",
    ],
    href: "https://www.icourse.club/course/386/",
  },
];
async function mockReviews(context: BrowserContext) {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data = fixturePayload(
      url.pathname + url.search,
      request.postDataJSON() ?? undefined,
    );
    if (url.pathname.includes("/teach/lesson/list-for-teach/")) {
      const template = (data as Record<string, unknown>[])[0]!;
      data = records.map((record, index) => ({
        ...template,
        id: `review-${index}`,
        code: `REVIEW.0${index + 1}`,
        course: { id: "review-course", code: "REVIEW", cn: record.name },
        teacherAssignmentList: record.teachers.map((cn) => ({ cn })),
      }));
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}

test("review links agree in list, candidate, timetable and comparison details", async ({
  context,
  page,
}) => {
  await mockReviews(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/lessons?semester=demo-current");
  const rows = page.locator(".lesson-table tbody tr");
  await expect(rows).toHaveCount(records.length);
  for (let i = 0; i < records.length; i++) {
    const link = rows.nth(i).locator(".icourse-link");
    await expect(link).toHaveAttribute("href", records[i]!.href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAccessibleName(new RegExp(records[i]!.name));
  }
  const direct = rows.first().locator(".icourse-link");
  await context.route("https://www.icourse.club/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>review</title>" }),
  );
  await direct.focus();
  const popupPromise = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(records[0]!.href);
  await popup.close();
  await rows.first().locator(".course-name").click();
  await expect(page.locator("dialog[open] .icourse-link")).toHaveAttribute(
    "href",
    records[0]!.href,
  );
  await page.keyboard.press("Escape");
  await expect(rows.first().locator(".course-name")).toBeFocused();
  await rows.first().locator(".candidate-button").click();
  await page.locator(".candidate-row .course-name").click();
  await expect(page.locator("dialog[open] .icourse-link")).toHaveAttribute(
    "href",
    records[0]!.href,
  );
  await page.keyboard.press("Escape");
  await rows.first().getByRole("button", { name: "对比", exact: true }).click();
  await rows.nth(1).getByRole("button", { name: "对比", exact: true }).click();
  await page.locator(".lesson-comparison .course-name").nth(1).click();
  await expect(page.locator("dialog[open] .icourse-link")).toHaveAttribute(
    "href",
    records[1]!.href,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "周课表", exact: true }).click();
  await page.locator(".tt-block:not(.tt-dense)").first().click();
  await expect(page.locator("dialog[open] .icourse-link")).toHaveAttribute(
    "href",
    records[0]!.href,
  );
  await page.keyboard.press("Escape");
  // All route resources, including the optional review index, are available offline.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.unroute("https://api.catalog.enthusjast.cc/**");
  await context.setOffline(true);
  await page.reload();
  await page.locator(".tt-block:not(.tt-dense)").first().click();
  await expect(page.locator("dialog[open] .icourse-link")).toHaveAttribute(
    "href",
    records[0]!.href,
  );
  expect(errors).toEqual([]);
});

test("review links remain compact in five widths and both themes", async ({
  browser,
}) => {
  for (const width of [320, 375, 768, 1440, 1920])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await context.addInitScript(
        (value) => localStorage.setItem("catalog:theme", value),
        theme,
      );
      await mockReviews(context);
      const page = await context.newPage();
      await page.goto("/#/lessons?semester=demo-current");
      const link = page.locator(".lesson-table .icourse-link").first();
      await expect(link).toHaveAttribute("href", records[0]!.href);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.locator(".lesson-table .course-name").first().click();
      await expect(page.locator("dialog[open] .icourse-link")).toHaveAttribute(
        "href",
        records[0]!.href,
      );
      await page.locator("dialog[open] .icourse-link").scrollIntoViewIfNeeded();
      const bounds = await page
        .locator("dialog[open] .icourse-link")
        .boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      if (width === 375)
        await page.screenshot({
          path: test.info().outputPath(`review-${theme}.png`),
        });
      await page.keyboard.press("Escape");
      await expect(
        page.locator(".lesson-table .course-name").first(),
      ).toBeFocused();
      await context.close();
    }
});

test("failed optional index uses search without interrupting lessons", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  await mockReviews(context);
  await context.route("**/assets/icourseLinks-*.js", (route) => route.abort());
  const page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/lessons?semester=demo-current");
  await expect(
    page.locator(".lesson-table .icourse-link").first(),
  ).toHaveAttribute(
    "href",
    "https://www.icourse.club/search/?q=" +
      encodeURIComponent(records[0]!.name),
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});
