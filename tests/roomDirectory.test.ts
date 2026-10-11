import { describe, it, expect } from "vitest";
import {
  extractRooms,
  normalizeRooms,
  directoryDiff,
} from "../scripts/room-directory.mjs";
const rows = Array.from({ length: 52 }, (_, i) => ({
  id: i,
  code: String(1101 + i),
  nameZh: String(1101 + i),
  nameEn: String(1101 + i),
  buildingCode: "1",
  floor: (i % 3) + 1,
  enabled: true,
  canBorrow: true,
  arrangeSchedule: false,
}));
describe("room directory sync", () => {
  it("extracts literal records and keeps explicit floors", () => {
    const rooms = extractRooms(`const rooms=${JSON.stringify(rows)};`);
    expect(rooms).toHaveLength(52);
    expect(rooms.find((r) => r.id === 3)?.floor).toBe(1);
  });
  it("understands minified boolean constants without executing code", () => {
    expect(
      extractRooms(
        `const rooms=${JSON.stringify(rows).replaceAll("true", "!0").replaceAll("false", "!1")};`,
      ),
    ).toHaveLength(52);
    expect(() =>
      extractRooms('const rooms=fetch("https://untrusted.invalid")'),
    ).toThrow();
  });
  it("applies the explicit visibility rule", () => {
    expect(
      normalizeRooms([...rows, { ...rows[0], id: 999, enabled: false }], true),
    ).toHaveLength(52);
  });
  it("rejects duplicate identities and empty or malformed data", () => {
    expect(() => normalizeRooms([])).toThrow();
    expect(() => normalizeRooms([rows[0], rows[0]], true)).toThrow();
    expect(() => normalizeRooms([{ id: 1 }])).toThrow();
  });
  it("reports floor changes, additions and removals", () => {
    const before = normalizeRooms(rows, true),
      after = before
        .slice(1)
        .map((r) => (r.id === 2 ? { ...r, floor: 20 } : r));
    after.push({ ...before[0], id: 1000 });
    const diff = directoryDiff(before, after);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
    expect(diff.changed[0]?.after.floor).toBe(20);
  });
});
