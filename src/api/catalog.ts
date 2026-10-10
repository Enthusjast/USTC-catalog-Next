import { query, TTL } from "./client";
import * as schema from "./schemas";
import * as adapt from "../adapters/catalog";
import type { QueryResult, Program, Course } from "../domain/models";
import type { PublicCourseCatalogue } from "../domain/courseCatalog";
import { resolveProgramReferences } from "../domain/programReferences";
type Options = { signal?: AbortSignal; force?: boolean };
async function map<T, U>(
  promise: Promise<QueryResult<T>>,
  convert: (data: T) => U,
): Promise<QueryResult<U>> {
  const result = await promise;
  return { data: convert(result.data), meta: result.meta };
}
const e = encodeURIComponent;
async function expandedProgram(
  id: string,
  options?: Options,
): Promise<QueryResult<Program>> {
  const result = await catalog.program(id, options);
  const data = await resolveProgramReferences(
    result.data,
    (referenceId) => catalog.module(referenceId, options),
    options?.signal,
  );
  return { ...result, data };
}
export const catalog = {
  expandedProgram,
  semesters: (options?: Options) =>
    map(
      query("/teach/semester/list", schema.semesterSchema, {
        ttl: TTL.reference,
        ...options,
      }),
      adapt.semesters,
    ),
  departments: (options?: Options) =>
    map(
      query("/teach/department/college-tree", schema.departmentSchema, {
        ttl: TTL.reference,
        ...options,
      }),
      adapt.departments,
    ),
  search: (keyword: string, options?: Options) =>
    map(
      query(
        `/teach/course/search?keyword=${e(keyword)}`,
        schema.courseSearchSchema,
        options,
      ),
      adapt.courses,
    ),
  quality: (options?: Options) =>
    map(
      query("/teach/course/quality", schema.courseCollectionSchema, options),
      adapt.courseCollection,
    ),
  publicCourses: async (
    entry: PublicCourseCatalogue,
    options?: Options,
  ): Promise<QueryResult<Course[]>> => {
    const parts = await Promise.all(
      entry.sourceIds.map((id) =>
        map(
          query(
            `/teach/course/public/${e(id)}`,
            schema.courseCollectionSchema,
            options,
          ),
          adapt.courseCollection,
        ),
      ),
    );
    if (parts.length === 1) return parts[0]!;
    // Collapse identical records, retaining different source memberships for the same code.
    const unique = new Map(
      parts
        .flatMap((part) => part.data)
        .map((course) => [JSON.stringify(course), course]),
    );
    const sources = parts.map((part) => part.meta);
    return {
      data: [...unique.values()],
      meta: {
        source: `https://catalog.ustc.edu.cn/catalog/${encodeURIComponent(entry.code)}`,
        retrievedAt: sources.map((source) => source.retrievedAt).sort()[0]!,
        state: sources.some((source) => source.state === "stale")
          ? "stale"
          : sources.some((source) => source.state === "cache")
            ? "cache"
            : "online",
        kind: sources.every((source) => source.kind === "demo")
          ? "demo"
          : undefined,
        sources,
        message:
          "此结果合并多个门类。查询时间按最早读取的来源计算，各来源的缓存状态可展开查看。",
      },
    };
  },
  departmentCourses: (id: string, name: string, options?: Options) =>
    map(
      query(
        `/teach/course/department/${e(id)}`,
        schema.courseCollectionSchema,
        options,
      ),
      (data) => adapt.courseCollection(data, name),
    ),
  course: (code: string, options?: Options) =>
    map(
      query("/teach/course/infos", schema.courseDetailSchema, {
        ...options,
        body: { codes: [code] },
      }),
      adapt.courseDetails,
    ),
  courses: (codes: string[], options?: Options) =>
    map(
      query("/teach/course/infos", schema.courseDetailSchema, {
        ...options,
        body: { codes: [...new Set(codes)].sort() },
      }),
      adapt.courseDetails,
    ),
  lessonDetails: (code: string, semester: string, options?: Options) =>
    map(
      query("/teach/lesson/infos", schema.courseDetailSchema, {
        ...options,
        body: {
          codes: [code],
          semester: /^\d+$/.test(semester) ? Number(semester) : semester,
        },
      }),
      adapt.courseDetails,
    ),
  lessons: (semester: string, options?: Options) =>
    map(
      query(
        `/teach/lesson/list-for-teach/${e(semester)}`,
        schema.lessonSchema,
        { ttl: TTL.schedule, ...options },
      ),
      adapt.lessons,
    ),
  programs: (options?: Options) =>
    map(
      query("/teach/program/tree", schema.programTreeSchema, {
        ttl: TTL.reference,
        ...options,
      }),
      adapt.programTree,
    ),
  program: (id: string, options?: Options) =>
    map(
      query(`/teach/program/info/${e(id)}`, schema.programInfoSchema, {
        ttl: TTL.reference,
        ...options,
      }),
      adapt.program,
    ),
  module: (id: string, options?: Options) =>
    map(
      query(`/teach/course-module/info/${e(id)}`, schema.moduleSchema, {
        ttl: TTL.reference,
        ...options,
      }),
      adapt.programModule,
    ),
  exams: (semester: string, general: boolean, options?: Options) =>
    map(
      query(
        `/teach/${general ? "general-exam" : "exam"}/list/${e(semester)}`,
        schema.examSchema,
        { ttl: TTL.schedule, ...options },
      ),
      (data) => adapt.exams(data, general ? "general" : "course"),
    ),
  rooms: (date: string, options?: Options) =>
    map(
      query(`/teach/timetable-public-all/${e(date)}`, schema.timetableSchema, {
        ttl: TTL.rooms,
        ...options,
      }),
      adapt.roomUsage,
    ),
  substitutions: (options?: Options) =>
    map(
      query("/teach/course-substitute-pool/list", schema.substitutionSchema, {
        ttl: TTL.schedule,
        ...options,
      }),
      adapt.substitutions,
    ),
};
