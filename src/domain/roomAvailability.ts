import type { RoomUsage } from "./models";
import { buildingLabel, type RoomDirectoryEntry } from "./roomDirectory";
export interface RoomSummary {
  room: string;
  building?: string;
  records: RoomUsage[];
  state: "occupied" | "inferred" | "unknown";
  capacity?: number;
  campus?: string;
  floor?: number;
  directorySource?: "official";
  directoryId?: number;
}
export const roomStateLabels = {
  occupied: "有公开占用",
  inferred: "推算未发现占用",
  unknown: "未知 / 覆盖不足",
};
const normalized = (value: string) => value.trim().toUpperCase();
export const roomKey = (
  room: Pick<RoomSummary, "building" | "room" | "directoryId">,
) =>
  room.directoryId !== undefined
    ? `directory:${room.directoryId}`
    : JSON.stringify([room.building, room.room]);

export function roomAvailability(
  records: RoomUsage[],
  from?: number,
  to?: number,
  directory: readonly RoomDirectoryEntry[] = [],
): RoomSummary[] {
  const byBuilding = new Map<string, RoomDirectoryEntry[]>();
  const byName = new Map<string, RoomDirectoryEntry[]>();
  for (const entry of directory) {
    for (const alias of new Set(
      [entry.code, entry.name, entry.englishName]
        .filter(Boolean)
        .map(normalized),
    )) {
      const scoped = JSON.stringify([entry.buildingCode, alias]);
      byBuilding.set(scoped, [...(byBuilding.get(scoped) ?? []), entry]);
      byName.set(alias, [...(byName.get(alias) ?? []), entry]);
    }
  }
  const summaries = new Map<string, RoomSummary>();
  for (const entry of directory) {
    const room: RoomSummary = {
      room: entry.name,
      building: entry.buildingCode,
      floor: entry.floor,
      directorySource: "official",
      directoryId: entry.id,
      records: [],
      state: "unknown",
    };
    summaries.set(`directory:${entry.id}`, room);
  }
  for (const record of records) {
    if (!record.room?.trim()) continue;
    const alias = normalized(record.room);
    const candidates = record.building?.trim()
      ? byBuilding.get(JSON.stringify([record.building.trim(), alias]))
      : byName.get(alias);
    const match = candidates?.length === 1 ? candidates[0] : undefined;
    const key = match
      ? `directory:${match.id}`
      : JSON.stringify([record.building, alias]);
    const summary: RoomSummary = summaries.get(key) ?? {
      room: record.room,
      building: record.building,
      floor: match?.floor,
      directorySource: match ? "official" : undefined,
      directoryId: match?.id,
      records: [],
      state: "unknown",
    };
    summary.records.push(record);
    if (record.capacity !== undefined && summary.capacity === undefined)
      summary.capacity = record.capacity;
    if (record.campus && !summary.campus) summary.campus = record.campus;
    summaries.set(key, summary);
  }
  const unlocated = records.some((record) => !record.room?.trim());
  const validRange =
    from !== undefined &&
    to !== undefined &&
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    to > from;
  for (const room of summaries.values()) {
    const occupied =
      validRange &&
      room.records.some(
        (record) =>
          record.start !== undefined &&
          record.end !== undefined &&
          Number.isFinite(record.start) &&
          Number.isFinite(record.end) &&
          record.end > record.start &&
          record.start < to! &&
          record.end > from!,
      );
    const unknown =
      !validRange ||
      unlocated ||
      !room.records.length ||
      room.records.some(
        (record) =>
          record.start === undefined ||
          record.end === undefined ||
          !Number.isFinite(record.start) ||
          !Number.isFinite(record.end) ||
          record.end <= record.start,
      );
    room.state = occupied ? "occupied" : unknown ? "unknown" : "inferred";
  }
  return [...summaries.values()].sort((a, b) =>
    a.room.localeCompare(b.room, "zh", { numeric: true }),
  );
}

export interface RoomFloorGroup {
  key: string;
  building?: string;
  floor?: number;
  label: string;
  title: string;
  rooms: RoomSummary[];
}
export const roomFloorLabel = (floor?: number) =>
  floor === undefined ? "楼层未确认" : `${floor}F`;
export function groupRoomFloors(rooms: RoomSummary[]): RoomFloorGroup[] {
  const groups = new Map<string, RoomFloorGroup>();
  for (const room of rooms) {
    const key = JSON.stringify([room.building, room.floor]);
    const group = groups.get(key) ?? {
      key,
      building: room.building,
      floor: room.floor,
      label: roomFloorLabel(room.floor),
      title: `${buildingLabel(room.building)} / ${roomFloorLabel(room.floor)}`,
      rooms: [],
    };
    group.rooms.push(room);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => {
      if (a.building !== b.building) {
        if (!a.building) return 1;
        if (!b.building) return -1;
        return a.building.localeCompare(b.building, "zh", { numeric: true });
      }
      return (a.floor ?? Infinity) - (b.floor ?? Infinity);
    })
    .map((group) => ({
      ...group,
      rooms: [...group.rooms].sort((a, b) =>
        a.room.localeCompare(b.room, "zh", { numeric: true }),
      ),
    }));
}

export interface RoomBuildingGroup {
  key: string;
  building?: string;
  title: string;
  floors: RoomFloorGroup[];
}
export function groupRoomBuildings(rooms: RoomSummary[]): RoomBuildingGroup[] {
  const groups = new Map<string, RoomBuildingGroup>();
  for (const floor of groupRoomFloors(rooms)) {
    const key = JSON.stringify(floor.building ?? null);
    const group = groups.get(key) ?? {
      key,
      building: floor.building,
      title: buildingLabel(floor.building),
      floors: [],
    };
    group.floors.push(floor);
    groups.set(key, group);
  }
  return [...groups.values()];
}
export const usageTypes: Record<string, string> = {
  lessons: "教学班",
  tmpLessons: "临时教学安排",
  roomOccupies: "公开占用",
  exams: "考试",
  makeupExams: "补考",
  tmpExams: "临时考试",
};
