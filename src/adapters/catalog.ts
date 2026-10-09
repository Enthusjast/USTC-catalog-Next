import { z } from "zod";
import type {
  Course,
  Department,
  Exam,
  Lesson,
  Program,
  ProgramModule,
  ProgramSummary,
  RoomUsage,
  Semester,
  Substitution,
} from "../domain/models";
import * as schemas from "../api/schemas";
import { clockMinutes, parseSchedule } from "../domain/schedule";

/** Extract text in an inert document; API markup never enters the live DOM. */
export function plainText(value?: string | null) {
  if (!value) return undefined;
  const document = new DOMParser().parseFromString(
    value
      .replace(/<\/(p|li|div|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n"),
    "text/html",
  );
  document
    .querySelectorAll("script,style,iframe,object")
    .forEach((node) => node.remove());
  return document.body.textContent?.trim() || undefined;
}
export const semesters = (
  data: z.infer<typeof schemas.semesterSchema>,
): Semester[] =>
  data
    .map((s) => ({
      id: String(s.id),
      code: s.code,
      name: s.nameZh,
      start: s.start,
      end: s.end,
      current: s.isLast ?? false,
    }))
    .sort((a, b) => b.start.localeCompare(a.start));
export const departments = (
  data: z.infer<typeof schemas.departmentSchema>,
): Department[] =>
  data.map((d) => ({
    id: String(d.id ?? d.code),
    code: d.code,
    name: d.nameZh,
    englishName: d.nameEn ?? undefined,
    children: departments(d.children ?? []),
  }));
export function flattenDepartments(data: Department[]): Department[] {
  return data.flatMap((d) => [d, ...flattenDepartments(d.children)]);
}
export const courses = (
  data: z.infer<typeof schemas.courseSearchSchema>,
  department?: string,
): Course[] =>
  data.map((c) => ({
    code: c.number,
    name: c.name,
    englishName: c.ename ?? undefined,
    valid: c.valid,
    lastTerm: c.lastTerm ?? undefined,
    department: c.dept ?? department,
    category: c.gradation ?? c.category ?? undefined,
    classification: c.classify ?? undefined,
  }));
export function courseCollection(
  data: z.infer<typeof schemas.courseCollectionSchema>,
  department?: string,
): Course[] {
  return courses(
    Array.isArray(data) ? data : Object.values(data).flat(),
    department,
  );
}
export const courseDetails = (
  data: z.infer<typeof schemas.courseDetailSchema>,
): Course[] =>
  data.map((c) => ({
    code: c.code,
    name: c.name.cn ?? c.code,
    englishName: c.name.en ?? undefined,
    department: c.dept ?? undefined,
    credits: c.credit ?? undefined,
    hours: c.hour ?? undefined,
    description: plainText(c.desc?.cn),
    valid: c.valid,
    lastTerm: c.lastTerm ?? undefined,
    prerequisites: plainText(c.preq),
    examMode: c.examType ?? undefined,
    language: c.lang ?? undefined,
    references: plainText(c.ref),
    category: c.courseCategory ?? undefined,
    classification: c.courseClassify ?? undefined,
  }));
export const lessons = (data: z.infer<typeof schemas.lessonSchema>): Lesson[] =>
  data.map((l) => ({
    id: String(l.id),
    code: l.code,
    course: {
      code: l.course.code,
      name: l.course.cn,
      englishName: l.course.en ?? undefined,
    },
    department: l.openDepartment.cn,
    departmentCode: l.openDepartment.code,
    teachers: l.teacherAssignmentList
      .map((t) => t.cn)
      .filter((name): name is string => !!name),
    schedule: parseSchedule(
      l.dateTimePlacePersonText?.cn ?? l.dateTimePlaceText ?? "",
    ),
    credits: l.credits ?? undefined,
    hours: l.period ?? undefined,
    count: l.stdCount ?? undefined,
    capacity: l.limitCount ?? undefined,
    education: l.education?.cn ?? undefined,
    classType: l.classType?.cn ?? undefined,
    category: l.courseCategory?.cn ?? undefined,
    language: l.teachLang?.cn ?? undefined,
    examMode: l.examMode?.cn ?? undefined,
    campus: l.campus?.cn ?? undefined,
  }));
export const programTree = (
  data: z.infer<typeof schemas.programTreeSchema>,
): ProgramSummary[] =>
  Object.values(data)
    .flatMap((d) =>
      Object.values(d.majors).flatMap((m) =>
        m.programs.map((p) => ({
          id: String(p.id),
          name: p.nameZh,
          grade: String(p.grade),
          trainType: p.trainType,
          department: d.nameZh,
          major: m.nameZh,
        })),
      ),
    )
    .sort(
      (a, b) =>
        b.grade.localeCompare(a.grade) ||
        a.department.localeCompare(b.department, "zh"),
    );
export function programModule(data: schemas.ModuleDTO): ProgramModule {
  const s = data.self;
  return {
    id: String(s.id),
    name: s.type,
    requirement: plainText(s.remark),
    requiredCredits: s.requiredCredits ?? undefined,
    requiredCourses: s.requiredCourseNum ?? undefined,
    publicId: s.public == null ? undefined : String(s.public),
    courses: (s.courses ?? []).map((c) => ({
      course: {
        code: c.course.code,
        name: c.course.nameZh,
        englishName: c.course.nameEn ?? undefined,
        credits: c.course.credits ?? undefined,
        description: plainText(c.course.introduction),
        department: c.department?.nameZh,
        category: c.course.courseGradation ?? undefined,
      },
      compulsory: c.compulsory,
      terms: c.terms ?? [],
      remark: plainText(c.remark),
    })),
    children: (data.children ?? []).map(programModule),
  };
}
export const program = (
  data: z.infer<typeof schemas.programInfoSchema>,
): Program => ({
  grade: String(data.grade),
  trainType: data.trainType,
  department: data.department.nameZh,
  major: data.major.nameZh,
  requiredCredits: data.requiredCredits ?? undefined,
  beginSemester: data.beginSemester ?? undefined,
  modules: data.moduleTree.map(programModule),
});
export const exams = (data: z.infer<typeof schemas.examSchema>): Exam[] =>
  data.map((e) => ({
    id: String(e.id),
    courseCode: e.lesson?.course.code ?? e.courseCode ?? "",
    courseName: e.lesson?.course.cn ?? e.courseName ?? e.courseCode ?? "未提供",
    lessonCode: e.lesson?.code ?? undefined,
    date: e.examDate ?? undefined,
    start: clockMinutes(e.startTime),
    end: clockMinutes(e.endTime),
    rooms: (e.examRooms ?? []).map((r) => r.room),
    department: e.lesson?.openDepartment?.cn ?? undefined,
    remark: e.examMode ?? undefined,
  }));
export const roomUsage = (
  data: z.infer<typeof schemas.timetableSchema>,
): RoomUsage[] =>
  Object.entries(data.timetable).flatMap(([type, records]) =>
    records.map((r, i) => ({
      id: `${type}:${r.id ?? i}:${i}`,
      room: r.classroomName ?? undefined,
      building: r.buildingCode ?? undefined,
      title:
        typeof r.courseName === "string"
          ? r.courseName
          : typeof r.name === "string"
            ? r.name
            : "公开占用记录",
      start: clockMinutes(r.start),
      end: clockMinutes(r.end),
      type,
      capacity: typeof r.capacity === "number" ? r.capacity : undefined,
      campus: typeof r.campus === "string" ? r.campus : undefined,
    })),
  );
export const substitutions = (
  data: z.infer<typeof schemas.substitutionSchema>,
): Substitution[] =>
  data.map((s, i) => ({
    id: String(s.id ?? i),
    substitutes: s.substituteCourses.map((c) => ({
      code: c.code,
      name: c.cn,
      englishName: c.en ?? undefined,
      credits: c.credits ?? undefined,
    })),
    originals: s.originalCourses.map((c) => ({
      code: c.code,
      name: c.cn,
      englishName: c.en ?? undefined,
      credits: c.credits ?? undefined,
    })),
    remark: plainText(s.remark),
  }));
