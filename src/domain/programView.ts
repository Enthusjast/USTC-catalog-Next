import type { ProgramModule, ProgramCourse } from "./models";
import { courseMatches, matchesText } from "./search";
export interface ProgramOccurrence {
  key: string;
  path: string;
  entry: ProgramCourse;
}
export function filterProgramModules(
  modules: ProgramModule[],
  query: string,
): ProgramModule[] {
  if (!query.trim()) return modules;
  return modules.flatMap((module) => {
    if (matchesText([module.name, module.requirement], query)) return [module];
    const courses = module.courses.filter(
      (e) =>
        courseMatches(e.course, query) ||
        matchesText([e.remark, ...e.terms], query),
    );
    const children = filterProgramModules(module.children, query);
    return courses.length || children.length
      ? [{ ...module, courses, children }]
      : [];
  });
}
export function programOccurrences(
  modules: ProgramModule[],
  prefix = "",
): ProgramOccurrence[] {
  return modules.flatMap((module) => {
    const path = prefix ? `${prefix} / ${module.name}` : module.name;
    return [
      ...module.courses.map((entry, index) => ({
        key: JSON.stringify([module.id, index, path]),
        path,
        entry,
      })),
      ...programOccurrences(module.children, path),
    ];
  });
}
export function programTermGroups(modules: ProgramModule[]) {
  const groups = new Map<string, ProgramOccurrence[]>();
  for (const row of programOccurrences(modules))
    for (const term of new Set(row.entry.terms.length ? row.entry.terms : [""]))
      groups.set(term, [...(groups.get(term) ?? []), row]);
  return [...groups]
    .sort(([a], [b]) =>
      !a ? 1 : !b ? -1 : a.localeCompare(b, "zh", { numeric: true }),
    )
    .map(([term, entries]) => ({
      term,
      label: term || "建议学期未提供",
      entries,
    }));
}
export function programModuleRows(
  modules: ProgramModule[],
  prefix = "",
): { path: string; module: ProgramModule }[] {
  return modules.flatMap((module) => {
    const path = prefix ? `${prefix} / ${module.name}` : module.name;
    return [{ path, module }, ...programModuleRows(module.children, path)];
  });
}
