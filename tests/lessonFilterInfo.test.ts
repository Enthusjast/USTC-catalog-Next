import { describe, it, expect, vi, beforeEach } from "vitest";
import { effectScope, ref, nextTick } from "vue";
import type { Lesson } from "../src/domain/models";
const load = vi.hoisted(() => vi.fn());
vi.mock("../src/api/catalog", () => ({ catalog: { lessonFilterInfo: load } }));
vi.mock("../src/api/client", () => ({
  API_BASE: "https://example.test",
  TTL: { schedule: 600000 },
  ApiError: class extends Error {},
}));
import { useLessonFilterInfo } from "../src/features/useLessonFilterInfo";
const settle = async () => {
  await nextTick();
  await new Promise((r) => setTimeout(r, 10));
};
const lesson = (code: string) => ({ code }) as Lesson;
beforeEach(() => {
  load.mockReset();
  vi.stubGlobal("navigator", { onLine: true });
  load.mockImplementation(async (codes: string[]) => ({
    data: codes.map((code) => ({ code, discipline: undefined })),
    meta: {
      source: "test",
      retrievedAt: new Date().toISOString(),
      state: "online",
    },
  }));
});
describe("metadata loading", () => {
  it("waits for an explicit request and reuses previously fetched records", async () => {
    const scope = effectScope(),
      semester = ref("1"),
      lessons = ref([lesson("A")]),
      enabled = ref(false);
    const query = scope.run(() =>
      useLessonFilterInfo(semester, lessons, enabled),
    )!;
    await settle();
    expect(load).not.toHaveBeenCalled();
    enabled.value = true;
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(query.data.value?.[0]?.code).toBe("A");
    lessons.value = [lesson("A"), lesson("B")];
    await settle();
    expect(load.mock.calls[1]?.[0]).toEqual(["B"]);
    scope.stop();
  });
  it("does not interpret an absent response as a missing field", async () => {
    load.mockResolvedValue({
      data: [],
      meta: {
        source: "test",
        retrievedAt: new Date().toISOString(),
        state: "online",
      },
    });
    const scope = effectScope();
    const query = scope.run(() =>
      useLessonFilterInfo(ref("1"), ref([lesson("A")]), true),
    )!;
    await settle();
    expect(query.data.value).toBeUndefined();
    expect(query.error.value?.message).toContain("未返回");
    scope.stop();
  });
  it("batches by 100", async () => {
    const scope = effectScope();
    scope.run(() =>
      useLessonFilterInfo(
        ref("1"),
        ref(Array.from({ length: 205 }, (_, i) => lesson(String(i)))),
        true,
      ),
    );
    await settle();
    expect(load.mock.calls.map((c) => c[0].length)).toEqual([100, 100, 5]);
    scope.stop();
  });
});
