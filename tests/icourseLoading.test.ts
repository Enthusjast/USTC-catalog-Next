import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.doUnmock("../src/data/icourseLinks");
});
describe("optional icourse index", () => {
  it("shares one lazy load across links", async () => {
    const load = vi.fn(() => ({ getIcourseIndex: () => ({ key: "1208" }) }));
    vi.doMock("../src/data/icourseLinks", load);
    const { useIcourseLinks } = await import("../src/features/useIcourseLinks");
    const first = useIcourseLinks(),
      second = useIcourseLinks();
    expect(first).toBe(second);
    await vi.waitFor(() => expect(first.value).toEqual({ key: "1208" }));
    expect(load).toHaveBeenCalledOnce();
  });
  it("keeps search usable when loading rejects", async () => {
    vi.doMock("../src/data/icourseLinks", () => {
      throw new Error("offline");
    });
    const { useIcourseLinks } = await import("../src/features/useIcourseLinks");
    const index = useIcourseLinks();
    await vi.waitFor(() => expect(index.value).toEqual({}));
    const { icourseLink } = await import("../src/domain/icourse");
    expect(
      icourseLink(
        { course: { code: "1", name: "课程" }, teachers: ["甲"] },
        index.value,
      ).label,
    ).toBe("评课搜索");
  });
});
