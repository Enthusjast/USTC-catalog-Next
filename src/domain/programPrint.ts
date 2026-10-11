import type { Program, ProgramCourse, ProgramModule } from "./models";
import { programModuleRows, programTermGroups } from "./programView";
import { escapeHTML as e, printHTML } from "./print";
const table = (entries: { path: string; entry: ProgramCourse }[]) =>
  `<table><thead><tr><th>课程编号</th><th>课程</th><th>学分</th><th>属性</th><th>建议学期</th><th>模块与备注</th></tr></thead><tbody>${entries.map(({ path, entry }) => `<tr><td>${e(entry.course.code)}</td><td>${e(entry.course.name)}</td><td>${e(entry.course.credits ?? "未提供")}</td><td>${entry.compulsory === undefined ? "未提供" : entry.compulsory ? "必修" : "选修"}</td><td>${e(entry.terms.join("、") || "未提供")}</td><td>${e(path)}${entry.remark ? `<br>${e(entry.remark)}` : ""}</td></tr>`).join("")}</tbody></table>`;
export function printProgram(
  program: Program,
  modules: ProgramModule[],
  view: string,
) {
  let body = `<h1>${e(program.major)} · ${e(program.grade)} 级</h1><p>${e(program.trainType)} · ${e(program.department)} · 计划要求学分：${e(program.requiredCredits ?? "未提供")}</p>`;
  for (const { path, module: m } of programModuleRows(modules)) {
    body += `<h2>${e(path)}</h2><p>${e(m.requirement ?? "")}</p><p>要求学分：${e(m.requiredCredits ?? "未提供")}；课程数：${e(m.requiredCourses ?? "未提供")}；子模块数：${e(m.requiredSubmodules ?? "未提供")}；学分上限：${e(m.creditsUpperLimit ?? "未提供")}；课程数上限：${e(m.courseCountUpperLimit ?? "未提供")}</p>`;
    for (const r of m.referenceRequirements ?? [])
      body += `<p>公共模块 ${e(r.name)} #${e(r.publicId)}：${e(r.requirement ?? "")}；要求学分 ${e(r.requiredCredits ?? "未提供")}；课程数 ${e(r.requiredCourses ?? "未提供")}；子模块数 ${e(r.requiredSubmodules ?? "未提供")}；学分上限 ${e(r.creditsUpperLimit ?? "未提供")}；课程数上限 ${e(r.courseCountUpperLimit ?? "未提供")}</p>`;
    if (m.publicId && m.referenceState !== "resolved")
      body += "<p>公共模块引用未完整解析。</p>";
    if (view !== "terms" && m.courses.length)
      body += table(m.courses.map((entry) => ({ path, entry })));
  }
  if (view === "terms")
    for (const group of programTermGroups(modules))
      body += `<h2>${e(group.label)}</h2>${table(group.entries)}`;
  for (const issue of program.referenceIssues ?? [])
    body += `<p>未解析引用：${e(issue.name)} #${e(issue.publicId)} · ${e(issue.message)}</p>`;
  printHTML(`${program.major}培养计划`, body);
}
