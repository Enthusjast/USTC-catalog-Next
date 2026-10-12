import type { CandidateScheme } from "./workspace";
import { lessonConflicts } from "./schedule";
import { timetableBlocks } from "./timetable";
export function schemeStats(scheme: CandidateScheme, week: number) {
  const courses = new Map<string, typeof scheme.lessons>();
  for (const lesson of scheme.lessons)
    courses.set(lesson.course.code, [
      ...(courses.get(lesson.course.code) ?? []),
      lesson,
    ]);
  let credits = 0;
  const unknownCredits: string[] = [];
  for (const [code, rows] of courses) {
    const values = new Set(rows.map((l) => l.credits));
    if (values.size === 1 && !values.has(undefined)) credits += [...values][0]!;
    else unknownCredits.push(code);
  }
  const periods = Array.from(
    { length: 7 },
    () => new Map<number, Set<string>>(),
  );
  for (const block of timetableBlocks(scheme.lessons, week))
    for (let period = block.start; period < block.end; period++) {
      const map = periods[block.day - 1]!,
        ids = map.get(period) ?? new Set<string>();
      ids.add(block.lesson.id);
      map.set(period, ids);
    }
  return {
    courses: courses.size,
    credits,
    unknownCredits,
    conflicts: lessonConflicts(scheme.lessons),
    days: periods.map((map) => ({
      occupied: map.size,
      overlapping: [...map.values()].filter((ids) => ids.size > 1).length,
    })),
  };
}
export function compareSchemes(left: CandidateScheme, right: CandidateScheme) {
  const codes = (s: CandidateScheme) =>
      new Set(s.lessons.map((l) => l.course.code)),
    a = codes(left),
    b = codes(right);
  const signature = (s: CandidateScheme, code: string) =>
    JSON.stringify(
      s.lessons
        .filter((l) => l.course.code === code)
        .sort((x, y) => x.code.localeCompare(y.code))
        .map(({ id: _id, ...lesson }) => lesson),
    );
  return {
    added: [...b].filter((code) => !a.has(code)),
    removed: [...a].filter((code) => !b.has(code)),
    changed: [...a].filter(
      (code) => b.has(code) && signature(left, code) !== signature(right, code),
    ),
  };
}
