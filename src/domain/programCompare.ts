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
  const modulePaths = (modules: ProgramModule[], prefix = ""): string[] =>
    modules.flatMap((m) => {
      const path = prefix ? `${prefix} / ${m.name}` : m.name;
      return [path, ...modulePaths(m.children, path)];
    });
  const oldPaths = modulePaths(left.modules),
    newPaths = modulePaths(right.modules);
  return {
    added,
    removed,
    changed,
    unmatchedModules: {
      before: oldPaths.filter((path) => !newPaths.includes(path)),
      after: newPaths.filter((path) => !oldPaths.includes(path)),
    },
  };
}
