import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
test("concurrent favorite additions, stale private drafts and clearing synchronize between tabs", async ({
  context,
}) => {
  // Delay notification delivery so both tabs deliberately add from the same painted state.
  // The second transaction must still read the latest database row, not its page snapshot.
  await context.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { value: undefined });
    const listen = window.addEventListener.bind(window);
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (!["storage", "focus"].includes(type))
        return listen(type, listener, options);
      listen(
        type,
        (event) =>
          setTimeout(() => {
            if (typeof listener === "function") listener.call(window, event);
            else listener.handleEvent(event);
          }, 500),
        options,
      );
    }) as typeof window.addEventListener;
  });
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
  const a = await context.newPage(),
    b = await context.newPage();
  await Promise.all([
    a.goto("/#/courses?q=DEMO101&course=DEMO101"),
    b.goto("/#/courses?q=DEMO101&course=DEMO101"),
  ]);
  await Promise.all([
    expect(
      a.getByRole("button", { name: "收藏课程", exact: true }),
    ).toBeEnabled(),
    expect(
      b.getByRole("button", { name: "收藏课程", exact: true }),
    ).toBeEnabled(),
  ]);
  await Promise.all([
    a.getByRole("button", { name: "收藏课程", exact: true }).click(),
    b.getByRole("button", { name: "收藏课程", exact: true }).click(),
  ]);
  await expect(
    a.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await expect(
    b.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  for (const page of [a, b])
    await page
      .getByRole("button", { name: "编辑 DEMO101 收藏分组与备注", exact: true })
      .click();
  await a.getByLabel("个人备注", { exact: true }).fill("旧草稿");
  await b.getByLabel("个人备注", { exact: true }).fill("另一页的新备注");
  await b
    .locator("dialog[open]")
    .last()
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await a
    .locator("dialog[open]")
    .last()
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(a.locator(".favorite-editor")).toContainText("已被另一页修改");
  await expect(a.getByLabel("个人备注", { exact: true })).toHaveValue("旧草稿");
  await a.keyboard.press("Escape");
  await a
    .getByRole("button", { name: "编辑 DEMO101 收藏分组与备注", exact: true })
    .click();
  await expect(a.getByLabel("个人备注", { exact: true })).toHaveValue(
    "另一页的新备注",
  );
  await a.keyboard.press("Escape");
  await b.goto("/#/about/data");
  await b
    .getByRole("button", { name: "清除全部本机数据", exact: true })
    .click();
  await b.getByRole("button", { name: "确认清除", exact: true }).click();
  await expect(
    a.getByRole("button", { name: "收藏课程", exact: true }),
  ).toBeVisible();
  await expect(
    a.getByRole("button", { name: "编辑 DEMO101 收藏分组与备注", exact: true }),
  ).toHaveCount(0);
});
