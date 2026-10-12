import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("undo and selective candidate updates preserve the scheme", async ({
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
    if (modified && url.pathname.includes("/teach/lesson/list-for-teach/"))
      data = (data as any[]).map((row) =>
        row.code === "DEMO101.01"
          ? {
              ...row,
              teacherAssignmentList: [{ cn: "更新教师" }],
              dateTimePlacePersonText: { cn: "1~8周 1101 :2(3,4) 更新教师" },
              limitCount: 40,
            }
          : row,
      );
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/lessons?semester=demo-current&q=DEMO101");
  await page
    .getByRole("button", { name: "加入 演示数学基础 候选清单", exact: true })
    .click();
  await page
    .getByRole("button", { name: "移除 演示数学基础 候选清单", exact: true })
    .click();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".candidate-row")).toHaveCount(1);
  modified = true;
  await page
    .getByRole("button", { name: "检查候选安排更新", exact: true })
    .click();
  await expect(page.locator("dialog[open] .update-preview-row")).toContainText(
    "更新教师",
  );
  await page
    .getByRole("button", { name: "确认更新所选项", exact: true })
    .click();
  await expect(page.locator(".candidate-row")).toContainText("更新教师");
  await page.getByRole("button", { name: "清空当前方案", exact: true }).click();
  await expect(page.locator(".candidate-row")).toHaveCount(0);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".candidate-row")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".candidate-row")).toHaveCount(1);
});
