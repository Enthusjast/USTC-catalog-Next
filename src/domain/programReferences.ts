import type {
  Program,
  ProgramModule,
  ProgramCourse,
  QueryResult,
  QueryMeta,
} from "./models";
import { abortIfNeeded } from "./concurrency";

export async function resolveProgramReferences(
  program: Program,
  load: (id: string) => Promise<QueryResult<ProgramModule>>,
  signal?: AbortSignal,
): Promise<Program> {
  const requests = new Map<string, Promise<QueryResult<ProgramModule>>>();
  const sources = new Map<string, QueryMeta>();
  const issues: NonNullable<Program["referenceIssues"]> = [];
  const signature = (entry: ProgramCourse) =>
    JSON.stringify([entry.course, entry.compulsory, entry.terms, entry.remark]);
  function courses(local: ProgramCourse[], shared: ProgramCourse[]) {
    const known = new Set(local.map(signature));
    return [
      ...local,
      ...shared.filter((entry) => {
        const key = signature(entry);
        if (known.has(key)) return false;
        known.add(key);
        return true;
      }),
    ];
  }
  async function resolve(
    module: ProgramModule,
    ancestors: string[],
  ): Promise<ProgramModule> {
    abortIfNeeded(signal);
    const children = await Promise.all(
      module.children.map((child) => resolve(child, ancestors)),
    );
    if (!module.publicId) return { ...module, children };
    const publicId = module.publicId;
    // The real public-module endpoint uses public === id for canonical definitions.
    if (publicId === module.id)
      return { ...module, children, referenceState: "resolved" };
    if (ancestors.includes(publicId) || ancestors.length >= 24) {
      const message =
        "公共模块引用存在循环或超出可识别层级，相关课程暂时未知。";
      issues.push({
        moduleId: module.id,
        name: module.name,
        publicId,
        message,
      });
      return { ...module, children, referenceState: "incomplete" };
    }
    try {
      if (!requests.has(publicId)) requests.set(publicId, load(publicId));
      const result = await requests.get(publicId)!;
      sources.set(result.meta.source, result.meta);
      const shared = await resolve(result.data, [...ancestors, publicId]);
      const localIds = new Set(
        children.flatMap((child) => [
          child.id,
          ...(child.publicId ? [child.publicId] : []),
        ]),
      );
      return {
        ...module,
        courses: courses(module.courses, shared.courses),
        children: [
          ...children,
          ...shared.children.filter((child) => !localIds.has(child.id)),
        ],
        referenceState:
          shared.referenceState === "incomplete" ? "incomplete" : "resolved",
      };
    } catch (error) {
      abortIfNeeded(signal);
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      issues.push({
        moduleId: module.id,
        name: module.name,
        publicId,
        message: error instanceof Error ? error.message : "公共模块无法读取。",
        source:
          error instanceof Error &&
          "source" in error &&
          typeof error.source === "string"
            ? error.source
            : undefined,
      });
      return { ...module, children, referenceState: "incomplete" };
    }
  }
  const modules = await Promise.all(
    program.modules.map((module) => resolve(module, [])),
  );
  abortIfNeeded(signal);
  return {
    ...program,
    modules,
    referenceIssues: issues,
    referenceSources: [...sources.values()],
  };
}
