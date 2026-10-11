import { z } from "zod";
import type { Lesson } from "./models";
export const MAX_SCHEMES = 20;
export const MAX_CANDIDATES = 100;
export const MAX_FAVORITES = 1000;
export const savedLessonSchema = z.object({
  id: z.string(),
  code: z.string(),
  course: z.object({
    code: z.string(),
    name: z.string(),
    englishName: z.string().optional(),
  }),
  department: z.string(),
  departmentCode: z.string(),
  teachers: z.array(z.string()),
  adminClasses: z.array(z.string()).optional(),
  schedule: z.object({
    slots: z.array(
      z.object({
        day: z.number().int().min(1).max(7),
        periods: z.array(z.number().int().min(1).max(14)),
        weeks: z.array(z.number().int().min(1).max(53)),
        location: z.string(),
      }),
    ),
    unknown: z.boolean(),
    text: z.string(),
  }),
  credits: z.number().optional(),
  hours: z.number().optional(),
  count: z.number().optional(),
  capacity: z.number().optional(),
  education: z.string().optional(),
  classType: z.string().optional(),
  courseType: z.string().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  examMode: z.string().optional(),
  campus: z.string().optional(),
});
const legacyPlannerSchema = z.record(
  z.string(),
  z.object({
    lessons: z.array(savedLessonSchema).max(100),
    savedAt: z.string(),
  }),
);

export const calendarSchema = z.object({
  firstMonday: z.string().default(""),
  layout: z.enum(["", "1", "2"]).default(""),
});
export const schemeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(40),
  lessons: z.array(savedLessonSchema).max(MAX_CANDIDATES),
  savedAt: z.string(),
  calendar: calendarSchema,
});
const semesterSchema = z
  .object({
    activeId: z.string(),
    schemes: z.array(schemeSchema).min(1).max(MAX_SCHEMES),
  })
  .superRefine((term, ctx) => {
    if (
      new Set(term.schemes.map((s) => s.id)).size !== term.schemes.length ||
      !term.schemes.some((s) => s.id === term.activeId)
    )
      ctx.addIssue({ code: "custom", message: "方案标识或当前方案无效" });
    if (
      term.schemes.some(
        (s) => new Set(s.lessons.map((l) => l.id)).size !== s.lessons.length,
      )
    )
      ctx.addIssue({ code: "custom", message: "候选教学班重复" });
  });
export const workspaceSchema = z.object({
  version: z.literal(1),
  semesters: z.record(z.string().min(1).max(100), semesterSchema),
  favorites: z.array(z.string().min(1).max(100)).max(MAX_FAVORITES),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export type CandidateScheme = z.infer<typeof schemeSchema>;
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  semesters: {},
  favorites: [],
});
export function createScheme(
  name = "默认方案",
  lessons: Lesson[] = [],
  calendar = { firstMonday: "", layout: "" },
): CandidateScheme {
  return schemeSchema.parse({
    id: crypto.randomUUID(),
    name,
    lessons,
    savedAt: new Date().toISOString(),
    calendar,
  });
}
export function migrateLegacy(plans: unknown, favorites: unknown): Workspace {
  const legacy = legacyPlannerSchema.parse(plans ?? {}),
    saved = z
      .array(z.string())
      .max(MAX_FAVORITES)
      .parse(favorites ?? []);
  const result = emptyWorkspace();
  result.favorites = [...new Set(saved)];
  for (const [id, plan] of Object.entries(legacy)) {
    const scheme = createScheme("默认方案", plan.lessons);
    scheme.savedAt = plan.savedAt;
    result.semesters[id] = { activeId: scheme.id, schemes: [scheme] };
  }
  return workspaceSchema.parse(result);
}
export function uniqueSchemeName(name: string, schemes: CandidateScheme[]) {
  const base = name.trim().slice(0, 40) || "导入方案";
  if (!schemes.some((s) => s.name === base)) return base;
  for (let i = 2; ; i++) {
    const suffix = ` (${i})`,
      next = base.slice(0, 40 - suffix.length) + suffix;
    if (!schemes.some((s) => s.name === next)) return next;
  }
}
const backupSchema = workspaceSchema.extend({
  format: z.literal("USTC-catalog-Next-backup"),
  exportedAt: z.string().datetime(),
});
export type WorkspaceBackup = z.infer<typeof backupSchema>;
export const makeBackup = (workspace: Workspace): WorkspaceBackup =>
  backupSchema.parse({
    ...workspace,
    format: "USTC-catalog-Next-backup",
    exportedAt: new Date().toISOString(),
  });
export function parseBackup(text: string): WorkspaceBackup {
  if (new TextEncoder().encode(text).length > 5 * 1024 * 1024)
    throw new Error("备份文件不能超过 5 MB。");
  try {
    return backupSchema.parse(JSON.parse(text));
  } catch {
    throw new Error("备份格式无效、版本不支持或数据超过限制。");
  }
}
export function mergeBackup(
  current: Workspace,
  backup: WorkspaceBackup,
): Workspace {
  const next = workspaceSchema.parse(JSON.parse(JSON.stringify(current)));
  next.favorites = [...new Set([...next.favorites, ...backup.favorites])];
  if (next.favorites.length > MAX_FAVORITES)
    throw new Error("合并后收藏超过 1000 门，未导入任何数据。");
  for (const [term, incoming] of Object.entries(backup.semesters)) {
    const existing = next.semesters[term];
    if ((existing?.schemes.length ?? 0) + incoming.schemes.length > MAX_SCHEMES)
      throw new Error(`学期 ${term} 合并后超过 20 个方案，未导入任何数据。`);
    const target = existing ?? {
      activeId: "",
      schemes: [] as CandidateScheme[],
    };
    for (const scheme of incoming.schemes) {
      const copy = {
        ...scheme,
        id: crypto.randomUUID(),
        name: uniqueSchemeName(scheme.name, target.schemes),
      };
      target.schemes.push(copy);
      if (!target.activeId) target.activeId = copy.id;
    }
    next.semesters[term] = target;
  }
  return workspaceSchema.parse(next);
}
