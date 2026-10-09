import { query, TTL } from "./client";
import * as schema from "./schemas";
import * as adapt from "../adapters/catalog";
import type { QueryResult } from "../domain/models";
type Options = { signal?: AbortSignal; force?: boolean };
async function map<T, U>(
  promise: Promise<QueryResult<T>>,
  convert: (data: T) => U,
): Promise<QueryResult<U>> {
  const result = await promise;
  return { data: convert(result.data), meta: result.meta };
}
const e = encodeURIComponent;
export const catalog = {
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
      adapt.exams,
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
