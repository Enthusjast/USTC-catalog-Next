import type { Lesson } from "./models";
import { weekdays } from "./schedule";
const slots = (lesson: Lesson) =>
  lesson.schedule.slots
    .map(
      (slot) =>
        `周${weekdays[slot.day - 1]} · 第 ${slot.periods.join("、")} 节 · 第 ${slot.weeks.join("、")} 周 · ${slot.location || "地点未提供"}`,
    )
    .join("\n") || "未提供";
const value = (v: unknown): string =>
  v === undefined || v === null || v === ""
    ? "未提供"
    : Array.isArray(v)
      ? v.join("、") || "未提供"
      : String(v);
const fields: { label: string; read: (lesson: Lesson) => unknown }[] = [
  { label: "课程", read: (l) => `${l.course.code} · ${l.course.name}` },
  { label: "英文名称", read: (l) => l.course.englishName },
  { label: "教师", read: (l) => [...l.teachers].sort() },
  { label: "课程班级", read: (l) => l.adminClasses?.slice().sort() },
  { label: "开课院系", read: (l) => `${l.department} (${l.departmentCode})` },
  { label: "时间与地点", read: (l) => l.schedule.text },
  { label: "学分", read: (l) => l.credits },
  { label: "学时", read: (l) => l.hours },
  { label: "人数", read: (l) => l.count },
  { label: "容量", read: (l) => l.capacity },
  { label: "校区", read: (l) => l.campus },
  { label: "授课语言", read: (l) => l.language },
  { label: "考核方式", read: (l) => l.examMode },
  { label: "学历层次", read: (l) => l.education },
  { label: "课堂类型", read: (l) => l.classType },
  { label: "课程类型", read: (l) => l.courseType },
  { label: "课程范畴", read: (l) => l.category },
];
export function candidateUpdates(saved: Lesson[], current: Lesson[]) {
  return saved.map((before) => {
    const matches = current.filter((l) => l.code === before.code);
    if (matches.length !== 1)
      return {
        before,
        status: matches.length ? ("ambiguous" as const) : ("missing" as const),
        after: undefined,
        fields: [],
      };
    const after = matches[0]!,
      changes = fields.flatMap((field) =>
        JSON.stringify(field.read(before)) === JSON.stringify(field.read(after))
          ? []
          : [
              {
                label: field.label,
                before: value(field.read(before)),
                after: value(field.read(after)),
              },
            ],
      );
    if (before.schedule.unknown !== after.schedule.unknown)
      changes.push({
        label: "安排识别",
        before: before.schedule.unknown ? "部分未知" : "可识别",
        after: after.schedule.unknown ? "部分未知" : "可识别",
      });
    if (
      JSON.stringify(before.schedule.slots) !==
        JSON.stringify(after.schedule.slots) &&
      !changes.some((f) => f.label === "时间与地点")
    )
      changes.push({
        label: "周次与课节",
        before: slots(before),
        after: slots(after),
      });
    if (before.id !== after.id)
      changes.push({
        label: "记录关联",
        before: "原保存记录",
        after: "当前公开记录",
      });
    return {
      before,
      after,
      status: changes.length ? ("changed" as const) : ("same" as const),
      fields: changes,
    };
  });
}
