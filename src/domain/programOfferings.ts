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
  return programModuleRows(modules).map((row) => ({
    ...row,
    entries: row.module.courses.map((entry, i) => ({
      key: JSON.stringify([row.path, row.module.id, i]),
      entry,
      lessons: index.get(entry.course.code) ?? [],
    })),
  }));
}
