import type { Lesson } from "./models";

export type IcourseIndex = Readonly<Record<string, string>>;
export type ReviewedLesson = Pick<Lesson, "course" | "teachers">;
export function icourseKey(name: string, teachers: readonly string[]) {
  const normalizedName = name.trim(),
    normalizedTeachers = [
      ...new Set(teachers.map((teacher) => teacher.trim()).filter(Boolean)),
    ].sort();
  return normalizedName && normalizedTeachers.length
    ? JSON.stringify([normalizedName, normalizedTeachers])
    : undefined;
}

export function icourseLink(lesson: ReviewedLesson, index?: IcourseIndex) {
  const key = icourseKey(lesson.course.name, lesson.teachers),
    id = key && index && Object.hasOwn(index, key) ? index[key] : undefined,
    direct = !!id && /^[1-9]\d*$/.test(id);
  return {
    direct,
    label: direct ? "评课社区" : "评课搜索",
    url: direct
      ? `https://www.icourse.club/course/${id}/`
      : `https://www.icourse.club/search/?q=${encodeURIComponent(lesson.course.name.trim())}`,
  };
}

/** Build only unique factual links; repeated copies of one ID are not ambiguous. */
export function buildIcourseIndex(records: unknown) {
  if (!Array.isArray(records) || !records.length)
    throw new Error("评课快照必须是非空记录数组。");
  const matches = new Map<string, Set<string>>();
  let unmatchable = 0;
  for (const record of records) {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      !Array.isArray(record.teachers) ||
      record.teachers.some((teacher: unknown) => typeof teacher !== "string") ||
      !/^[1-9]\d*$/.test(String(record["icourse-id"] ?? ""))
    )
      throw new Error("评课快照包含无效名称、教师或页面 ID。");
    const key = icourseKey(record.name, record.teachers);
    if (!key) {
      unmatchable++;
      continue;
    }
    const ids = matches.get(key) ?? new Set<string>();
    ids.add(String(record["icourse-id"]));
    matches.set(key, ids);
  }
  const index: Record<string, string> = {};
  let ambiguous = 0;
  for (const [key, ids] of [...matches].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    if (ids.size === 1) index[key] = [...ids][0]!;
    else ambiguous++;
  }
  if (!Object.keys(index).length)
    throw new Error("评课快照没有可唯一匹配的记录。");
  return {
    index,
    records: records.length,
    unique: Object.keys(index).length,
    ambiguous,
    unmatchable,
  };
}
