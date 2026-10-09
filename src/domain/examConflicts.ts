import type { Exam } from "./models";
import { isISODate } from "./dates";
export function examConflicts(exams: Exam[], sharedRoom = false) {
  const known = exams.filter(
    (e) =>
      e.date &&
      isISODate(e.date) &&
      e.start !== undefined &&
      e.end !== undefined &&
      e.end > e.start,
  );
  const overlaps: { left: Exam; right: Exam; rooms: string[] }[] = [];
  const byDate = new Map<string, Exam[]>();
  known.forEach((e) =>
    byDate.set(e.date!, [...(byDate.get(e.date!) ?? []), e]),
  );
  for (const rows of byDate.values())
    for (let i = 0; i < rows.length; i++)
      for (let j = i + 1; j < rows.length; j++) {
        const left = rows[i]!,
          right = rows[j]!,
          rooms = left.rooms.filter((room) => right.rooms.includes(room));
        if (
          left.start! < right.end! &&
          right.start! < left.end! &&
          (!sharedRoom || rooms.length)
        )
          overlaps.push({ left, right, rooms });
      }
  return { overlaps, unknown: exams.filter((e) => !known.includes(e)) };
}
