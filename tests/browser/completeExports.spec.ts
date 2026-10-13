import { selectOption } from "./ui";
import { test, expect } from "@playwright/test";
import { fixturePayload } from "../../src/api/fixtures";
import { readFile } from "node:fs/promises";
test("all 1200 queried classes survive CSV, dense timetable, PNG pages and print appendix", async ({
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
      data = Array.from({ length: 1200 }, (_, i) => ({
        ...base,
        id: `many-${String(i).padStart(4, "0")}`,
        code: `DEMO101.${String(i).padStart(4, "0")}`,
      }));
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/#/lessons?semester=demo-current");
  await expect(page.locator(".lesson-table tbody tr")).toHaveCount(25);
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 CSV", exact: true }).click();
  const csv = await readFile((await (await csvDownload).path())!, "utf8");
  expect(csv).toContain("DEMO101.1199");
  expect(csv.split("\r\n").filter(Boolean)).toHaveLength(1201);
  await page.getByRole("button", { name: "周课表", exact: true }).click();
  await selectOption(page.locator("#timetable-source"), "results");
  const dense = page.locator(".tt-dense");
  await expect(dense).toContainText("1200 项安排");
  await dense.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".dense-schedule-row")).toHaveCount(50);
  await page
    .locator("dialog[open]")
    .getByRole("spinbutton", { name: "跳转页码", exact: true })
    .fill("24");
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "跳转", exact: true })
    .click();
  await expect(page.locator(".dense-schedule-row").last()).toContainText(
    "DEMO101.1199",
  );
  await page.keyboard.press("Escape");
  await expect(dense).toBeFocused();
  await page.getByRole("button", { name: "导出 PNG", exact: true }).click();
  const imageSelect = page.locator("#timetable-image-page");
  await imageSelect.click();
  const options = imageSelect.getByRole("option");
  expect(await options.count()).toBeGreaterThan(20);
  await options.last().click();
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存此张 PNG", exact: true }).click();
  const png = await readFile((await (await pngDownload).path())!);
  expect(png.readUInt32BE(16)).toBe(1400);
  expect(png.readUInt32BE(20)).toBeLessThanOrEqual(2048);
  await page.keyboard.press("Escape");
  // Prevent the OS print dialog while inspecting the complete generated document.
  await page.evaluate(() => {
    const create = document.createElement.bind(document);
    document.createElement = ((
      name: string,
      options?: ElementCreationOptions,
    ) => {
      const element = create(name, options);
      if (name === "iframe")
        element.addEventListener(
          "load",
          () => {
            (element as HTMLIFrameElement).contentWindow!.print = () => {};
          },
          { once: true },
        );
      return element;
    }) as typeof document.createElement;
  });
  await page.getByRole("button", { name: "打印 / PDF", exact: true }).click();
  await expect(page.frameLocator(".print-frame").locator("ol li")).toHaveCount(
    1200,
  );
  await expect(
    page.frameLocator(".print-frame").locator("ol li").last(),
  ).toContainText("DEMO101.1199");
});
