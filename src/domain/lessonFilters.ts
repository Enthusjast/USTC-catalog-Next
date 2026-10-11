import type { Lesson } from "./models";
import { lessonMatches } from "./search";
export const missingValue = "__missing__";
export function matchesOption(value: string | undefined, selected: string) {
  return !selected || (selected === missingValue ? !value : value === selected);
}
export type LessonFilters = Partial<
  Record<
    | "q"
    | "dept"
    | "teacher"
    | "day"
    | "period"
    | "location"
    | "education"
    | "type"
    | "courseType"
    | "category"
    | "campus"
    | "language"
    | "exam",
    string
  >
>;
export function matchesLessonFilters(l: Lesson, f: LessonFilters) {
  return (
    lessonMatches(l, f.q ?? "") &&
    (!f.dept || l.department === f.dept || l.departmentCode === f.dept) &&
    (!f.teacher || l.teachers.some((t) => t.includes(f.teacher!.trim()))) &&
    ((!f.day && !f.period) ||
      l.schedule.slots.some(
        (s) =>
          (!f.day || s.day === Number(f.day)) &&
          (!f.period || s.periods.includes(Number(f.period))),
      )) &&
    (!f.location || l.schedule.text.includes(f.location.trim())) &&
    (!f.education || l.education === f.education) &&
    (!f.type || l.classType === f.type) &&
    matchesOption(l.courseType, f.courseType ?? "") &&
    (!f.category || l.category === f.category) &&
    matchesOption(l.campus, f.campus ?? "") &&
    (!f.language || l.language === f.language) &&
    (!f.exam || l.examMode === f.exam)
  );
}
