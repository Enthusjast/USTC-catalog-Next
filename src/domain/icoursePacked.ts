import type { IcourseIndex } from "./icourse";
export interface PackedIcourseIndex {
  names: string[];
  teachers: string[];
  teacherSets: number[][];
  entries: [number, number, string][];
}
export function packIcourseIndex(index: IcourseIndex): PackedIcourseIndex {
  const names: string[] = [],
    teachers: string[] = [],
    teacherSets: number[][] = [],
    entries: PackedIcourseIndex["entries"] = [];
  const nameIds = new Map<string, number>(),
    teacherIds = new Map<string, number>(),
    setIds = new Map<string, number>();
  const intern = (text: string, list: string[], ids: Map<string, number>) => {
    if (!ids.has(text)) {
      ids.set(text, list.length);
      list.push(text);
    }
    return ids.get(text)!;
  };
  for (const [key, id] of Object.entries(index)) {
    const [name, teachersForCourse] = JSON.parse(key) as [string, string[]];
    const members = teachersForCourse.map((t) =>
        intern(t, teachers, teacherIds),
      ),
      setKey = JSON.stringify(members);
    if (!setIds.has(setKey)) {
      setIds.set(setKey, teacherSets.length);
      teacherSets.push(members);
    }
    entries.push([intern(name, names, nameIds), setIds.get(setKey)!, id]);
  }
  return { names, teachers, teacherSets, entries };
}
export function decodeIcourseIndex(packed: PackedIcourseIndex): IcourseIndex {
  const validText = (value: unknown): value is string =>
    typeof value === "string" && !!value.trim();
  const validId = (value: unknown, length: number): value is number =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < length;
  if (
    !Array.isArray(packed.names) ||
    !packed.names.every(validText) ||
    !Array.isArray(packed.teachers) ||
    !packed.teachers.every(validText) ||
    !Array.isArray(packed.teacherSets) ||
    !Array.isArray(packed.entries)
  )
    throw new Error("无效评课字典。");
  const teachers = packed.teacherSets.map((set) => {
    if (
      !Array.isArray(set) ||
      !set.length ||
      !set.every((id) => validId(id, packed.teachers.length))
    )
      throw new Error("无效教师组合。");
    return set.map((id) => packed.teachers[id]!);
  });
  const index: Record<string, string> = Object.create(null);
  for (const row of packed.entries) {
    if (
      !Array.isArray(row) ||
      row.length !== 3 ||
      !validId(row[0], packed.names.length) ||
      !validId(row[1], teachers.length) ||
      typeof row[2] !== "string" ||
      !/^[1-9]\d*$/.test(row[2])
    )
      throw new Error("无效评课页面。");
    const key = JSON.stringify([
      packed.names[row[0]]!.trim(),
      [...new Set(teachers[row[1]]!.map((t) => t.trim()))].sort(),
    ]);
    if (Object.hasOwn(index, key)) throw new Error("重复评课组合。");
    index[key] = row[2];
  }
  return index;
}
