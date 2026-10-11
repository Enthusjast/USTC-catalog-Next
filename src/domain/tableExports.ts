import type { Course, Lesson, LessonFilterInfo, Exam, Program } from "./models";
import { downloadCSV, type CSVValue } from "./csv";
import { formatClock } from "./schedule";
import { comparePrograms } from "./programCompare";
import {
  programOccurrences,
  programModuleRows,
  programTermGroups,
} from "./programView";
export function exportCourses(courses: Course[]) {
  downloadCSV(
    "ustc-courses.csv",
    [
      "课程编号",
      "课程名称",
      "英文名称",
      "院系",
      "分类",
      "有效状态",
      "最近开课学期",
      "学分",
      "学时",
    ],
    courses.map((c) => [
      c.code,
      c.name,
      c.englishName,
      c.department,
      c.classification ?? c.category,
      c.valid === undefined ? "" : c.valid ? "有效" : "历史",
      c.lastTerm,
      c.credits,
      c.hours,
    ]),
  );
}
export function exportLessons(
  lessons: Lesson[],
  metadata: Map<string, LessonFilterInfo>,
) {
  downloadCSV(
    "ustc-lessons.csv",
    [
      "教学班编号",
      "课程编号",
      "课程名称",
      "教师",
      "院系",
      "安排原文",
      "学分",
      "学时",
      "人数",
      "容量",
      "校区",
      "授课语言",
      "考试方式",
      "学科类别",
      "评分制",
    ],
    lessons.map((l) => [
      l.code,
      l.course.code,
      l.course.name,
      l.teachers.join("、"),
      l.department,
      l.schedule.text,
      l.credits,
      l.hours,
      l.count,
      l.capacity,
      l.campus,
      l.language,
      l.examMode,
      metadata.get(l.code)?.discipline,
      metadata.get(l.code)?.grading,
    ]),
  );
}
export function exportExams(exams: Exam[]) {
  downloadCSV(
    "ustc-exams.csv",
    [
      "类型",
      "课程编号",
      "教学班编号",
      "课程名称",
      "日期",
      "开始",
      "结束",
      "考场",
      "院系",
      "备注",
    ],
    exams.map((e) => [
      e.type,
      e.courseCode,
      e.lessonCode,
      e.courseName,
      e.date,
      formatClock(e.start),
      formatClock(e.end),
      e.rooms.join("、"),
      e.department,
      e.remark,
    ]),
  );
}
export function exportProgram(
  program: Program,
  modules: Program["modules"],
  view: string,
) {
  const headers = [
    "记录类别",
    "模块",
    "课程编号",
    "课程名称",
    "学分",
    "必选属性",
    "建议学期原文",
    "展示学期",
    "备注",
    "模块要求",
    "要求学分",
    "要求课程数",
    "要求子模块数",
    "学分上限",
    "课程数上限",
    "引用状态",
    "公共模块要求",
  ];
  const rows: CSVValue[][] = programModuleRows(modules).map(
    ({ path, module: m }) => [
      "模块",
      path,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      m.requirement,
      m.requiredCredits,
      m.requiredCourses,
      m.requiredSubmodules,
      m.creditsUpperLimit,
      m.courseCountUpperLimit,
      m.referenceState,
      JSON.stringify(m.referenceRequirements ?? []),
    ],
  );
  const occurrences =
    view === "terms"
      ? programTermGroups(modules).flatMap((group) =>
          group.entries.map((row) => ({ ...row, term: group.label })),
        )
      : programOccurrences(modules).map((row) => ({ ...row, term: "" }));
  rows.push(
    ...occurrences.map(({ path, entry: e, term }) => [
      "课程",
      path,
      e.course.code,
      e.course.name,
      e.course.credits,
      e.compulsory === undefined ? "" : e.compulsory ? "必修" : "选修",
      e.terms.join("、"),
      term,
      e.remark,
    ]),
  );
  program.referenceIssues?.forEach((issue) =>
    rows.push([
      "未解析引用",
      issue.name,
      "",
      "",
      "",
      "",
      "",
      "",
      issue.message,
    ]),
  );
  downloadCSV(
    `ustc-program-${program.grade}-${program.major}.csv`,
    headers,
    rows,
  );
}
export function exportProgramComparison(before: Program, after: Program) {
  const c = comparePrograms(before, after),
    rows: CSVValue[][] = [
      ["计划要求学分", "", before.requiredCredits, after.requiredCredits],
    ];
  c.added.forEach((row) =>
    rows.push(["新增课程", row.entry.course.code, "", JSON.stringify(row)]),
  );
  c.removed.forEach((row) =>
    rows.push(["移除课程", row.entry.course.code, JSON.stringify(row), ""]),
  );
  c.changed.forEach((row) =>
    rows.push([
      "课程字段变化",
      row.code,
      JSON.stringify(row.before),
      JSON.stringify(row.after),
    ]),
  );
  c.requirements.forEach((row) =>
    rows.push([
      "模块要求变化",
      row.path,
      JSON.stringify(row.before),
      JSON.stringify(row.after),
    ]),
  );
  c.unresolved.before.forEach((path) =>
    rows.push(["未解析引用（原计划）", path, "未知", ""]),
  );
  c.unresolved.after.forEach((path) =>
    rows.push(["未解析引用（目标计划）", path, "", "未知"]),
  );
  c.unmatchedModules.before.forEach((path) =>
    rows.push(["未匹配模块（原计划）", path, path, ""]),
  );
  c.unmatchedModules.after.forEach((path) =>
    rows.push(["未匹配模块（目标计划）", path, "", path]),
  );
  downloadCSV(
    "ustc-program-comparison.csv",
    ["变化类型", "课程编号或模块", "原计划", "目标计划"],
    rows,
  );
}
