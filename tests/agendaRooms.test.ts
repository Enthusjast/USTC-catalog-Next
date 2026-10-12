import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { teachingWeek, isFirstMonday } from "../src/domain/dates";
import { roomAvailability } from "../src/domain/roomAvailability";
import { roomDirectory } from "../src/domain/roomDirectory";
import { classroomDay } from "../src/domain/roomTimeline";
vi.mock("../src/api/environment", () => ({ DEMO_MODE: false }));
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
});
afterEach(() => vi.useRealTimers());
describe("today and room favorites", () => {
  it("requires an explicit Monday and handles teaching-week boundaries", () => {
    expect(isFirstMonday("2026-08-31")).toBe(true);
    expect(isFirstMonday("2026-09-01")).toBe(false);
    expect(teachingWeek("2026-08-31", "2026-10-13")).toBe(7);
    expect(teachingWeek("2026-08-31", "2026-08-30")).toBeUndefined();
    expect(teachingWeek("", "2026-10-13")).toBeUndefined();
    expect(teachingWeek("2026-08-31", "2028-01-01")).toBeUndefined();
  });
  it("updates the Shanghai day across midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T15:59:59Z"));
    const { useToday, refreshToday } = await import("../src/features/useToday");
    const today = useToday();
    expect(today.value).toBe("2026-10-12");
    vi.setSystemTime(new Date("2026-10-12T16:00:01Z"));
    refreshToday();
    expect(today.value).toBe("2026-10-13");
  });
  it("uses directory identity, survives backup and rejects non-directory rooms", async () => {
    const { workspaceReady, workspace, exportWorkspace } =
      await import("../src/features/useWorkspace");
    await workspaceReady;
    const { useRoomFavorites } =
      await import("../src/features/useRoomFavorites");
    const favorites = useRoomFavorites();
    const room = roomAvailability(
      [],
      classroomDay.from,
      classroomDay.to,
      roomDirectory,
    )[0]!;
    await favorites.toggle(room);
    expect(favorites.includes(room.directoryId)).toBe(true);
    expect(JSON.parse(exportWorkspace()).roomFavorites).toHaveLength(1);
    await favorites.toggle(room);
    expect(workspace.value.roomFavorites).toHaveLength(0);
    expect(await favorites.toggle({ ...room, directoryId: undefined })).toBe(
      false,
    );
  });
});
