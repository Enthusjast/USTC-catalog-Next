import type { Lesson, ProgramModule } from "./models";
import { programModuleRows } from "./programView";

/** Course codes are factual identifiers; names and prefixes cannot establish equivalence. */
export function lessonsByCourse(lessons: Lesson[]) {
  const index = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const rows = index.get(lesson.course.code) ?? [];
    rows.push(lesson);
    index.set(lesson.course.code, rows);
  }
  return index;
}
export function programOfferings(modules: ProgramModule[], lessons: Lesson[]) {
  const index = lessonsByCourse(lessons);
  return programModuleRows(modules).map((row) => {
    const copies = new Map<string, number>();
    return {
      ...row,
      entries: row.module.courses.map((entry) => {
        const identity = JSON.stringify(entry),
          ordinal = copies.get(identity) ?? 0;
        copies.set(identity, ordinal + 1);
        return {
          key: JSON.stringify([row.path, row.module.id, identity, ordinal]),
          entry,
          lessons: index.get(entry.course.code) ?? [],
        };
      }),
    };
  });
}
