import type { ProgramModule, ProgramCourse } from "./models";
export function courseOccurrences(
  modules: ProgramModule[],
  code: string,
  prefix = "",
): { path: string; entry: ProgramCourse }[] {
  return modules.flatMap((module) => {
    const path = prefix ? `${prefix} / ${module.name}` : module.name;
    return [
      ...module.courses
        .filter((entry) => entry.course.code === code)
        .map((entry) => ({ path, entry })),
      ...courseOccurrences(module.children, code, path),
    ];
  });
}
