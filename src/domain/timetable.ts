import type { Lesson } from "./models";
export interface TimetableBlock {
  key: string;
  lesson: Lesson;
  day: number;
  start: number;
  end: number;
  location: string;
}
export interface TimetableCluster {
  key: string;
  day: number;
  start: number;
  end: number;
  blocks: (TimetableBlock & { lane: number })[];
  lanes: number;
}
export function courseHue(code: string) {
  let hash = 0;
  for (const c of code) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return [211, 124, 335, 35, 275, 185, 65, 10][hash % 8]!;
}
export function timetableBlocks(
  lessons: Lesson[],
  week: number,
): TimetableBlock[] {
  const result: TimetableBlock[] = [];
  for (const lesson of lessons) {
    const groups = new Map<
      string,
      { day: number; location: string; periods: Set<number> }
    >();
    for (const slot of lesson.schedule.slots) {
      if (!slot.weeks.includes(week)) continue;
      const key = JSON.stringify([slot.day, slot.location]);
      const group = groups.get(key) ?? {
        day: slot.day,
        location: slot.location,
        periods: new Set<number>(),
      };
      slot.periods.forEach((p) => group.periods.add(p));
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const periods = [...group.periods].sort((a, b) => a - b);
      let start = periods[0],
        end = start;
      const save = () => {
        if (start === undefined || end === undefined) return;
        result.push({
          key: JSON.stringify([lesson.id, group.day, group.location, start]),
          lesson,
          day: group.day,
          start,
          end: end + 1,
          location: group.location,
        });
      };
      for (const period of periods.slice(1)) {
        if (period === end! + 1) end = period;
        else {
          save();
          start = period;
          end = period;
        }
      }
      save();
    }
  }
  return result.sort(
    (a, b) =>
      a.day - b.day ||
      a.start - b.start ||
      a.lesson.code.localeCompare(b.lesson.code, "zh", { numeric: true }),
  );
}
export function timetableClusters(
  blocks: TimetableBlock[],
): TimetableCluster[] {
  const result: TimetableCluster[] = [];
  for (let day = 1; day <= 7; day++) {
    const sorted = blocks
      .filter((b) => b.day === day)
      .sort(
        (a, b) =>
          a.start - b.start || b.end - a.end || a.key.localeCompare(b.key),
      );
    let current: TimetableCluster | undefined;
    let ends: number[] = [];
    for (const block of sorted) {
      if (!current || block.start >= current.end) {
        current = {
          key: block.key,
          day,
          start: block.start,
          end: block.end,
          blocks: [],
          lanes: 0,
        };
        result.push(current);
        ends = [];
      }
      let lane = ends.findIndex((end) => end <= block.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = block.end;
      current.end = Math.max(current.end, block.end);
      current.blocks.push({ ...block, lane });
      current.lanes = ends.length;
    }
  }
  return result;
}
