import type { Course, Lesson, ProgramSummary } from "./models";
const normalize = (text: string) => text.trim().toLocaleLowerCase();
export function matchesText(fields: (string | undefined)[], query: string) {
  const term = normalize(query);
  return (
    !term || fields.some((field) => field && normalize(field).includes(term))
  );
}
export const courseMatches = (c: Course, q: string) =>
  matchesText([c.code, c.name, c.englishName, c.department], q);
export const lessonMatches = (l: Lesson, q: string) =>
  matchesText(
    [
      l.code,
      l.course.code,
      l.course.name,
      l.course.englishName,
      l.department,
      ...l.teachers,
      l.schedule.text,
    ],
    q,
  );
export const programMatches = (p: ProgramSummary, q: string) =>
  matchesText([p.name, p.major, p.department, p.trainType, p.grade], q);
function score(fields: string[], query: string) {
  const term = normalize(query);
  if (!term) return 2;
  const values = fields.map(normalize);
  return values.some((v) => v === term)
    ? 0
    : values.some((v) => v.startsWith(term))
      ? 1
      : 2;
}
export function rankCourses(courses: Course[], query: string) {
  return [...courses].sort(
    (a, b) =>
      score([a.code, a.name, a.englishName ?? ""], query) -
        score([b.code, b.name, b.englishName ?? ""], query) ||
      Number(a.valid === false) - Number(b.valid === false) ||
      a.code.localeCompare(b.code, "zh", { numeric: true }),
  );
}
export function rankLessons(lessons: Lesson[], query: string) {
  return [...lessons].sort(
    (a, b) =>
      score(
        [a.code, a.course.code, a.course.name, a.course.englishName ?? ""],
        query,
      ) -
        score(
          [b.code, b.course.code, b.course.name, b.course.englishName ?? ""],
          query,
        ) || a.code.localeCompare(b.code, "zh", { numeric: true }),
  );
}
export function rankPrograms(programs: ProgramSummary[], query: string) {
  return [...programs].sort(
    (a, b) =>
      score([a.name, a.major], query) - score([b.name, b.major], query) ||
      b.grade.localeCompare(a.grade, "zh", { numeric: true }) ||
      a.id.localeCompare(b.id, "zh", { numeric: true }),
  );
}
