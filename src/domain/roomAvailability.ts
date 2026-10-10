import type { RoomUsage } from "./models";
export interface RoomSummary {
  room: string;
  building?: string;
  records: RoomUsage[];
  state: "occupied" | "inferred" | "unknown";
  capacity?: number;
  campus?: string;
}
export function roomAvailability(
  records: RoomUsage[],
  from?: number,
  to?: number,
): RoomSummary[] {
  const grouped = new Map<string, RoomUsage[]>(),
    unlocated = records.some((r) => !r.room);
  const validRange = from !== undefined && to !== undefined && to > from;
  records
    .filter((r) => !!r.room)
    .forEach((r) => {
      const key = `${r.building ?? ""}|${r.room}`;
      grouped.set(key, [...(grouped.get(key) ?? []), r]);
    });
  return [...grouped.values()]
    .map((rows) => {
      const occupied =
        validRange &&
        rows.some(
          (r) =>
            r.start !== undefined &&
            r.end !== undefined &&
            r.end > r.start &&
            r.start < to! &&
            r.end > from!,
        );
      const unknown =
        !validRange ||
        unlocated ||
        rows.some(
          (r) =>
            r.start === undefined || r.end === undefined || r.end <= r.start,
        );
      return {
        room: rows[0]!.room!,
        building: rows[0]!.building,
        records: rows,
        state: occupied
          ? ("occupied" as const)
          : unknown
            ? ("unknown" as const)
            : ("inferred" as const),
        capacity: rows.find((r) => r.capacity !== undefined)?.capacity,
        campus: rows.find((r) => r.campus)?.campus,
      };
    })
    .sort((a, b) => a.room.localeCompare(b.room, "zh", { numeric: true }));
}
export const usageTypes: Record<string, string> = {
  lessons: "教学班",
  tmpLessons: "临时教学安排",
  roomOccupies: "公开占用",
  exams: "考试",
  makeupExams: "补考",
  tmpExams: "临时考试",
};
