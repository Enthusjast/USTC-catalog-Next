import { z } from "zod";

const id = z.union([z.string().min(1), z.number()]);
const text = z.string().nullable().optional();
const number = z.number().nullable().optional();
const name = z.object({ cn: text, en: text }).passthrough();
export const restrictedSchema = z.object({ restricted: z.boolean() });
export const semesterSchema = z.array(
  z.object({
    id,
    code: z.string(),
    nameZh: z.string(),
    start: z.string(),
    end: z.string(),
    isLast: z.boolean().optional(),
  }),
);
interface DepartmentDTO {
  id?: string | number;
  code: string;
  nameZh: string;
  nameEn?: string | null;
  children?: DepartmentDTO[];
}
export const departmentNode: z.ZodType<DepartmentDTO> = z.lazy(() =>
  z.object({
    id: id.optional(),
    code: z.string(),
    nameZh: z.string(),
    nameEn: text,
    children: z.array(departmentNode).optional(),
  }),
);
export const departmentSchema = z.array(departmentNode);
export const courseSchema = z
  .object({
    number: z.string().min(1),
    name: z.string(),
    ename: text,
    valid: z.boolean(),
    lastTerm: text,
    dept: text,
    classify: text,
    gradation: text,
    category: text,
  })
  .passthrough();
export const courseSearchSchema = z.array(courseSchema);
export const courseCollectionSchema = z.union([
  courseSearchSchema,
  z.record(z.string(), courseSearchSchema),
]);
export const courseDetailSchema = z.array(
  z
    .object({
      code: z.string().min(1),
      name,
      desc: name.optional(),
      credit: number,
      hour: number,
      dept: text,
      valid: z.boolean().optional(),
      lastTerm: text,
      preq: text,
      examType: text,
      lang: text,
      ref: text,
      courseCategory: text,
      courseClassify: text,
    })
    .passthrough(),
);
export const lessonSchema = z.array(
  z
    .object({
      id,
      code: z.string().min(1),
      course: z.object({ id, code: z.string(), cn: z.string(), en: text }),
      credits: number,
      period: number,
      dateTimePlacePersonText: name.optional(),
      dateTimePlaceText: text,
      stdCount: number,
      limitCount: number,
      openDepartment: z
        .object({ code: z.string(), cn: z.string() })
        .passthrough(),
      teacherAssignmentList: z.array(name),
      education: name.optional(),
      classType: name.optional(),
      courseCategory: name.optional(),
      teachLang: name.optional(),
      examMode: name.optional(),
      campus: name.optional(),
    })
    .passthrough(),
);
const planSummary = z
  .object({ id, nameZh: z.string(), grade: id, trainType: z.string() })
  .passthrough();
export const programTreeSchema = z.record(
  z.string(),
  z
    .object({
      id,
      nameZh: z.string(),
      majors: z.record(
        z.string(),
        z
          .object({ nameZh: z.string(), programs: z.array(planSummary) })
          .passthrough(),
      ),
    })
    .passthrough(),
);
const programCourseSchema = z
  .object({
    course: z
      .object({
        code: z.string(),
        nameZh: z.string(),
        nameEn: text,
        credits: number,
        introduction: text,
        courseGradation: text,
      })
      .passthrough(),
    compulsory: z.boolean().optional(),
    terms: z.array(z.string()).optional(),
    remark: text,
    department: z.object({ nameZh: z.string() }).passthrough().optional(),
  })
  .passthrough();
const moduleSelfSchema = z
  .object({
    id,
    type: z.string(),
    remark: text,
    requiredCredits: number,
    requiredCourseNum: number,
    public: id.nullable().optional(),
    courses: z.array(programCourseSchema).optional(),
  })
  .passthrough();
export interface ModuleDTO {
  self: z.infer<typeof moduleSelfSchema>;
  isLeaf: boolean;
  children?: ModuleDTO[];
}
export const moduleSchema: z.ZodType<ModuleDTO> = z.lazy(() =>
  z
    .object({
      self: moduleSelfSchema,
      isLeaf: z.boolean(),
      children: z.array(moduleSchema).optional(),
    })
    .passthrough(),
);
export const programInfoSchema = z
  .object({
    grade: id,
    trainType: z.string(),
    department: z.object({ nameZh: z.string() }).passthrough(),
    major: z.object({ nameZh: z.string() }).passthrough(),
    requiredCredits: number,
    beginSemester: text,
    moduleTree: z.array(moduleSchema),
  })
  .passthrough();
export const examSchema = z.array(
  z
    .object({
      id,
      examDate: text,
      startTime: z.union([z.number(), z.string()]).nullable().optional(),
      endTime: z.union([z.number(), z.string()]).nullable().optional(),
      examRooms: z
        .array(z.object({ room: z.string() }).passthrough())
        .optional(),
      courseCode: text,
      courseName: text,
      lesson: z
        .object({
          code: text,
          course: z.object({ code: z.string(), cn: z.string() }).passthrough(),
          openDepartment: name.optional(),
        })
        .passthrough()
        .optional(),
      examMode: text,
    })
    .passthrough()
    .refine(
      (value) => !!value.lesson || !!value.courseCode,
      "缺少考试课程标识",
    ),
);
const usageSchema = z
  .object({
    id: id.optional(),
    classroomName: text,
    buildingCode: text,
    courseName: text,
    start: text,
    end: text,
  })
  .passthrough();
export const timetableSchema = z.object({
  timetable: z.object({
    lessons: z.array(usageSchema),
    tmpLessons: z.array(usageSchema),
    roomOccupies: z.array(usageSchema),
    exams: z.array(usageSchema),
    makeupExams: z.array(usageSchema),
    tmpExams: z.array(usageSchema),
  }),
});
const substitutionCourse = z
  .object({ code: z.string(), cn: z.string(), en: text, credits: number })
  .passthrough();
export const substitutionSchema = z.array(
  z
    .object({
      id: id.optional(),
      substituteCourses: z.array(substitutionCourse),
      originalCourses: z.array(substitutionCourse),
      remark: text,
    })
    .passthrough(),
);
