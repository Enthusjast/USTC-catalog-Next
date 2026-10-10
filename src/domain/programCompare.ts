import type { Program, ProgramCourse, ProgramModule } from "./models";
interface Entry {
  module: string;
  entry: ProgramCourse;
}
function entries(modules: ProgramModule[], prefix = ""): Entry[] {
  return modules.flatMap((m) => {
    const path = prefix ? `${prefix} / ${m.name}` : m.name;
    return [
      ...m.courses.map((entry) => ({ module: path, entry })),
      ...entries(m.children, path),
    ];
  });
}
export function comparePrograms(left: Program, right: Program) {
  const before = entries(left.modules),
    after = entries(right.modules);
  const index = (rows: Entry[]) => {
    const result = new Map<string, Entry[]>();
    rows.forEach((row) => {
      const code = row.entry.course.code;
      result.set(code, [...(result.get(code) ?? []), row]);
    });
    return result;
  };
  const a = index(before),
    b = index(after);
  const added = after.filter((row) => !a.has(row.entry.course.code)),
    removed = before.filter((row) => !b.has(row.entry.course.code));
  const changed: { code: string; before: Entry[]; after: Entry[] }[] = [];
  for (const [code, rows] of a) {
    const target = b.get(code);
    if (!target) continue;
    const signature = (items: Entry[]) =>
      JSON.stringify(
        items
          .map(({ module, entry }) => ({
            module,
            name: entry.course.name,
            credits: entry.course.credits,
            compulsory: entry.compulsory,
            terms: [...entry.terms].sort(),
            remark: entry.remark,
          }))
          .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))),
      );
    if (signature(rows) !== signature(target))
      changed.push({ code, before: rows, after: target });
  }
  const moduleRows = (
    modules: ProgramModule[],
    prefix = "",
  ): { path: string; module: ProgramModule }[] =>
    modules.flatMap((m) => {
      const path = prefix ? `${prefix} / ${m.name}` : m.name;
      return [{ path, module: m }, ...moduleRows(m.children, path)];
    });
  const oldModules = moduleRows(left.modules),
    newModules = moduleRows(right.modules);
  const oldPaths = oldModules.map((row) => row.path),
    newPaths = newModules.map((row) => row.path);
  const requirements = oldModules.flatMap((row) => {
    const matched = newModules.filter((next) => next.path === row.path);
    if (
      matched.length !== 1 ||
      oldPaths.filter((path) => path === row.path).length !== 1
    )
      return [];
    const signature = (m: ProgramModule) =>
      JSON.stringify([
        m.requiredCredits,
        m.requiredCourses,
        m.requiredSubmodules,
        m.creditsUpperLimit,
        m.courseCountUpperLimit,
        m.requirement,
        m.publicId,
        m.referenceRequirements,
      ]);
    return signature(row.module) !== signature(matched[0]!.module)
      ? [{ path: row.path, before: row.module, after: matched[0]!.module }]
      : [];
  });
  const unresolved = (rows: typeof oldModules) =>
    rows
      .filter(
        (row) =>
          row.module.publicId && row.module.referenceState !== "resolved",
      )
      .map((row) => `${row.path} (#${row.module.publicId})`);
  return {
    added,
    removed,
    changed,
    requirements,
    unresolved: {
      before: unresolved(oldModules),
      after: unresolved(newModules),
    },
    unmatchedModules: {
      before: oldPaths.filter(
        (path) =>
          !newPaths.includes(path) ||
          oldPaths.filter((p) => p === path).length > 1 ||
          newPaths.filter((p) => p === path).length > 1,
      ),
      after: newPaths.filter(
        (path) =>
          !oldPaths.includes(path) ||
          newPaths.filter((p) => p === path).length > 1 ||
          oldPaths.filter((p) => p === path).length > 1,
      ),
    },
  };
}
