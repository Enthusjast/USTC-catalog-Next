import { describe, it, expect, vi } from "vitest";
import { effectScope, ref, nextTick } from "vue";
const rooms = vi.hoisted(() => vi.fn());
vi.mock("../src/api/catalog", () => ({ catalog: { rooms } }));
vi.mock("../src/api/client", () => ({ ApiError: class extends Error {} }));
import { useRoomWeek } from "../src/features/useRoomWeek";
import { roomDirectory } from "../src/domain/roomDirectory";
import { roomAvailability } from "../src/domain/roomAvailability";
import { classroomDay } from "../src/domain/roomTimeline";
describe("room week queries", () => {
  it("loads seven days and distinguishes errors from empty records without assuming availability", async () => {
    rooms.mockImplementation(async (date: string) => {
      if (date === "2026-10-07") throw new Error("HTTP 503");
      return {
        data: [],
        meta: {
          source: date,
          retrievedAt: new Date().toISOString(),
          state: date === "2026-10-08" ? "stale" : "cache",
        },
      };
    });
    const scope = effectScope(),
      entry = roomAvailability(
        [],
        classroomDay.from,
        classroomDay.to,
        roomDirectory,
      )[0]!;
    const query = scope.run(() => useRoomWeek(ref("2026-10-11"), ref(entry)))!;
    await nextTick();
    await new Promise((r) => setTimeout(r, 20));
    expect(rooms).toHaveBeenCalledTimes(7);
    expect(query.data.value).toHaveLength(7);
    expect(query.data.value?.find((d) => d.date === "2026-10-07")?.status).toBe(
      "error",
    );
    expect(query.data.value?.find((d) => d.date === "2026-10-06")?.status).toBe(
      "loaded",
    );
    expect(query.data.value?.every((d) => d.room.state === "unknown")).toBe(
      true,
    );
    expect(query.meta.value?.state).toBe("stale");
    scope.stop();
  });
});
