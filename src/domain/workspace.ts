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
export const legacyWorkspaceSchema = z.object({
  version: z.literal(1),
  semesters: z.record(z.string().min(1).max(100), semesterSchema),
  favorites: z.array(z.string().min(1).max(100)).max(MAX_FAVORITES),
});
export const favoriteGroupSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(40),
});
export const favoriteDetailSchema = z.object({
  groupId: z.string().optional(),
  note: z.string().max(1000).default(""),
});
export const roomFavoriteSchema = z.object({
  directoryId: z.number().int().nonnegative(),
  room: z.string().min(1),
  building: z.string().min(1),
});
export const workspaceSchema = legacyWorkspaceSchema
  .extend({
    version: z.literal(2),
    revision: z.number().int().nonnegative().default(0),
    favoriteGroups: z.array(favoriteGroupSchema).max(20).default([]),
    favoriteDetails: z.record(z.string(), favoriteDetailSchema).default({}),
    roomFavorites: z.array(roomFavoriteSchema).max(100).default([]),
  })
  .superRefine((value, ctx) => {
    const groups = new Set(value.favoriteGroups.map((g) => g.id));
    if (
      groups.size !== value.favoriteGroups.length ||
      new Set(value.favoriteGroups.map((g) => g.name)).size !==
        value.favoriteGroups.length ||
      new Set(value.favorites).size !== value.favorites.length ||
      new Set(value.roomFavorites.map((r) => r.directoryId)).size !==
        value.roomFavorites.length
    )
      ctx.addIssue({ code: "custom", message: "收藏或分组重复" });
    for (const [code, detail] of Object.entries(value.favoriteDetails))
      if (
        !value.favorites.includes(code) ||
        (detail.groupId && !groups.has(detail.groupId))
      )
        ctx.addIssue({ code: "custom", message: "收藏分组引用无效" });
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export type CandidateScheme = z.infer<typeof schemeSchema>;
export const emptyWorkspace = (): Workspace => ({
  version: 2,
  revision: 0,
  favoriteGroups: [],
  favoriteDetails: {},
  roomFavorites: [],
  semesters: {},
  favorites: [],
});
export function upgradeWorkspace(value: unknown): Workspace {
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1
  ) {
    const legacy = legacyWorkspaceSchema.parse(value);
    return workspaceSchema.parse({
      ...emptyWorkspace(),
      ...legacy,
      version: 2,
      favorites: [...new Set(legacy.favorites)],
    });
  }
  return workspaceSchema.parse(value);
}
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
const backupSchema = workspaceSchema.safeExtend({
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
    const value = JSON.parse(text);
    if (value.version === 1) {
      legacyWorkspaceSchema
        .extend({
          format: z.literal("USTC-catalog-Next-backup"),
          exportedAt: z.string().datetime(),
        })
        .parse(value);
      return backupSchema.parse({
        ...upgradeWorkspace(value),
        format: value.format,
        exportedAt: value.exportedAt,
      });
    }
    return backupSchema.parse(value);
  } catch {
    throw new Error("备份格式无效、版本不支持或数据超过限制。");
  }
}
export function mergeBackup(
  current: Workspace,
  backup: WorkspaceBackup,
): Workspace {
  const next = workspaceSchema.parse(JSON.parse(JSON.stringify(current)));
  const groupIds = new Map<string, string>();
  for (const group of backup.favoriteGroups) {
    let target = next.favoriteGroups.find((g) => g.name === group.name);
    if (!target) {
      target = { ...group, id: crypto.randomUUID() };
      next.favoriteGroups.push(target);
    }
    groupIds.set(group.id, target.id);
  }
  for (const code of backup.favorites)
    if (!next.favorites.includes(code)) {
      const detail = backup.favoriteDetails[code];
      if (detail)
        next.favoriteDetails[code] = {
          ...detail,
          groupId: detail.groupId ? groupIds.get(detail.groupId) : undefined,
        };
    }
  for (const room of backup.roomFavorites)
    if (!next.roomFavorites.some((r) => r.directoryId === room.directoryId))
      next.roomFavorites.push(room);
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
export function serializeBackup(value: WorkspaceBackup) {
  const text = JSON.stringify(value, null, 2);
  if (new TextEncoder().encode(text).length > 5 * 1024 * 1024)
    throw new Error("备份超过 5 MB，请分方案导出。");
  return text;
}
export function singleSchemeBackup(
  workspace: Workspace,
  semester: string,
  id: string,
) {
  const scheme = workspace.semesters[semester]?.schemes.find(
    (s) => s.id === id,
  );
  if (!scheme) throw new Error("方案已被删除。");
  const result = emptyWorkspace();
  result.semesters[semester] = {
    activeId: id,
    schemes: [structuredClone(scheme)],
  };
  return makeBackup(result);
}
