import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("classroom weekdays, six usage groups and lesson links preserve compact browsing", async ({
  page,
  context,
}) => {
  await context.route("https://api.catalog.enthusjast.cc/**", async (route) => {
    const url = new URL(route.request().url());
    let data = fixturePayload(
      url.pathname + url.search,
      route.request().postDataJSON() ?? undefined,
    );
    if (url.pathname.includes("/timetable-public-all/"))
      data = {
        timetable: Object.fromEntries(
          [
            "lessons",
            "tmpLessons",
            "roomOccupies",
            "exams",
            "makeupExams",
            "tmpExams",
          ].map((type, i) => [
            type,
            [
              {
                id: type,
                classroomName: "1101",
                buildingCode: "1",
                courseName: i === 0 ? "演示数学基础" : `占用 ${type}`,
                courseId: i === 0 ? "DEMO101.01" : undefined,
                start: `${String(8 + i).padStart(2, "0")}:00`,
                end: `${String(8 + i).padStart(2, "0")}:45`,
              },
            ],
          ]),
        ),
      };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/classrooms?date=2026-10-13");
  await expect(page.locator(".room-building-controls")).toHaveCSS(
    "position",
    "static",
  );
  await expect(page.locator(".room-usage-block.teaching")).toHaveCount(1);
  await expect(page.locator(".room-usage-block.occupation")).toHaveCount(2);
  await expect(page.locator(".room-usage-block.exam")).toHaveCount(3);
  const trigger = page.locator(".room-usage-block.teaching");
  await trigger.focus();
  await page.keyboard.press("Space");
  const link = page
    .locator(".room-usage-popover")
    .getByRole("link", { name: "查看教学班详情", exact: true });
  await expect(link).toHaveAttribute(
    "href",
    /semester=demo-current.*lesson=DEMO101.01/,
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page
    .locator(".room-label")
    .filter({ hasText: /^1101$/ })
    .click();
  await page.getByRole("button", { name: "本周使用", exact: true }).click();
  await expect(page.locator(".room-weekday")).toHaveText([
    "周一",
    "周二",
    "周三",
    "周四",
    "周五",
    "周六",
    "周日",
  ]);
  await expect(page.locator("dialog[open] .room-date-line strong")).toHaveText([
    "10-12",
    "10-13",
    "10-14",
    "10-15",
    "10-16",
    "10-17",
    "10-18",
  ]);
  await page.locator("dialog[open] .room-usage-block.teaching").first().click();
  await expect(page.locator(".room-usage-popover")).toContainText("2026-10-12");
  await page
    .locator(".room-usage-popover")
    .getByRole("link", { name: "查看教学班详情", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "公开教学班详情", exact: true }),
  ).toBeVisible();
  await expect(page.locator("dialog[open]")).toContainText("DEMO101.01");
});
