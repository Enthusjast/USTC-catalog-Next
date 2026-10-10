import type { RoomUsage } from "./models";

// Full teaching day in the official classroom view, checked 2026-10-10.
export const classroomDay = {
  from: 7 * 60 + 50,
  to: 21 * 60 + 55,
  plotHeight: 360,
};

export function hasUsageTime(
  record: RoomUsage,
): record is RoomUsage & { start: number; end: number } {
  return (
    record.start !== undefined &&
    record.end !== undefined &&
    Number.isFinite(record.start) &&
    Number.isFinite(record.end) &&
    record.end > record.start
  );
}

export function usageCategory(type: string) {
  if (type === "lessons" || type === "tmpLessons") return "teaching";
  if (type === "roomOccupies") return "occupation";
  if (["exams", "makeupExams", "tmpExams"].includes(type)) return "exam";
  return "other";
}

/** Position visible intervals without changing their duration or overlap. */
export function layoutRoomUsage(
  records: RoomUsage[],
  from: number,
  to: number,
) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const intervals = records
    .filter(hasUsageTime)
    .filter((record) => record.start < to && record.end > from)
    .map((record) => ({
      record,
      start: Math.max(from, record.start),
      end: Math.min(to, record.end),
    }))
    .sort(
      (a, b) =>
        a.start - b.start ||
        b.end - a.end ||
        a.record.id.localeCompare(b.record.id),
    );
  const clusters: (typeof intervals)[] = [];
  let end = -Infinity;
  for (const interval of intervals) {
    if (interval.start >= end) {
      clusters.push([]);
      end = interval.end;
    } else end = Math.max(end, interval.end);
    clusters[clusters.length - 1]!.push(interval);
  }
  return clusters.flatMap((cluster) => {
    const laneEnds: number[] = [];
    const placed = cluster.map((interval) => {
      let lane = laneEnds.findIndex((lastEnd) => lastEnd <= interval.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = interval.end;
      return { ...interval, lane };
    });
    return placed.map((interval) => ({
      record: interval.record,
      top: ((interval.start - from) / (to - from)) * 100,
      height: ((interval.end - interval.start) / (to - from)) * 100,
      left: (interval.lane / laneEnds.length) * 100,
      width: 100 / laneEnds.length,
      clippedStart: interval.record.start < from,
      clippedEnd: interval.record.end > to,
    }));
  });
}

export function roomTimelineTicks(from: number, to: number, plotHeight = 240) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const step =
    [15, 30, 60, 120, 180, 240].find((value) => (to - from) / value <= 8) ??
    240;
  const values = [from];
  for (let time = Math.ceil(from / step) * step; time < to; time += step) {
    // Keep endpoint labels at least 24px away from an adjacent tick.
    if (
      (time - from) / (to - from) > 24 / plotHeight &&
      (to - time) / (to - from) > 24 / plotHeight
    )
      values.push(time);
  }
  values.push(to);
  return values.map((time) => ({
    time,
    position: ((time - from) / (to - from)) * 100,
  }));
}
