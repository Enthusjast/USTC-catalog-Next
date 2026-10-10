export interface Semester {
  id: string;
  code: string;
  name: string;
  start: string;
  end: string;
  current: boolean;
}
export interface Department {
  id: string;
  code: string;
  name: string;
  englishName?: string;
  children: Department[];
}
export interface CourseTextbook {
  name?: string;
  englishName?: string;
  author?: string;
  publisher?: string;
  edition?: string;
  publicationDate?: string;
  isbn?: string;
}
export interface Course {
  code: string;
  name: string;
  englishName?: string;
  department?: string;
  valid?: boolean;
  lastTerm?: string;
  category?: string;
  classification?: string;
  credits?: number;
  hours?: number;
  description?: string;
  englishDescription?: string;
  prerequisites?: string;
  examMode?: string;
  language?: string;
  references?: string;
  grading?: string;
  discipline?: string;
  courseType?: string;
  textbook?: string;
  textbooks?: CourseTextbook[];
}
export interface TimeSlot {
  day: number;
  periods: number[];
  weeks: number[];
  location: string;
}
export interface Schedule {
  slots: TimeSlot[];
  unknown: boolean;
  text: string;
}
export interface Lesson {
  id: string;
  code: string;
  course: Course;
  department: string;
  departmentCode: string;
  teachers: string[];
  adminClasses?: string[];
  schedule: Schedule;
  credits?: number;
  hours?: number;
  count?: number;
  capacity?: number;
  education?: string;
  classType?: string;
  courseType?: string;
  category?: string;
  language?: string;
  examMode?: string;
  campus?: string;
}
export interface LessonFilterInfo {
  code: string;
  discipline?: string;
  grading?: string;
}
export interface ProgramSummary {
  id: string;
  name: string;
  grade: string;
  trainType: string;
  department: string;
  major: string;
}
export interface ProgramCourse {
  course: Course;
  compulsory?: boolean;
  terms: string[];
  remark?: string;
}
export interface ProgramModule {
  id: string;
  name: string;
  requirement?: string;
  requiredCredits?: number;
  requiredCourses?: number;
  requiredSubmodules?: number;
  creditsUpperLimit?: number;
  courseCountUpperLimit?: number;
  publicId?: string;
  courses: ProgramCourse[];
  children: ProgramModule[];
  referenceState?: "resolved" | "incomplete";
  referenceRequirements?: {
    publicId: string;
    name: string;
    requirement?: string;
    requiredCredits?: number;
    requiredCourses?: number;
    requiredSubmodules?: number;
    creditsUpperLimit?: number;
    courseCountUpperLimit?: number;
  }[];
}
export interface Program {
  grade: string;
  trainType: string;
  department: string;
  major: string;
  requiredCredits?: number;
  beginSemester?: string;
  modules: ProgramModule[];
  referenceIssues?: {
    moduleId: string;
    name: string;
    publicId: string;
    message: string;
    source?: string;
  }[];
  referenceSources?: QueryMeta[];
}
export interface Exam {
  type?: "course" | "general";
  id: string;
  courseCode: string;
  courseName: string;
  lessonCode?: string;
  date?: string;
  start?: number;
  end?: number;
  rooms: string[];
  department?: string;
  remark?: string;
}
export interface RoomUsage {
  id: string;
  room?: string;
  building?: string;
  title: string;
  start?: number;
  end?: number;
  type: string;
  capacity?: number;
  campus?: string;
  teachers?: string[];
  courseId?: string;
  applierName?: string;
  sponsorName?: string;
}
export interface Substitution {
  id: string;
  substitutes: Course[];
  originals: Course[];
  remark?: string;
}
export interface QueryMeta {
  sources?: QueryMeta[];
  message?: string;
  kind?: "archive" | "demo";
  snapshotAt?: string;
  retrievedAt: string;
  source: string;
  state: "online" | "cache" | "stale";
}
export interface QueryResult<T> {
  data: T;
  meta: QueryMeta;
}
