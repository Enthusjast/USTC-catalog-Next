/** Invented development examples. Never cached under production API keys. */
const courseA = {
  id: "demo-a",
  code: "DEMO101",
  cn: "演示数学基础",
  en: "Demo Mathematics",
};
const courseB = {
  id: "demo-b",
  code: "DEMO102",
  cn: "演示数值方法",
  en: "Demo Numerical Methods",
};
const courseRows = [
  {
    number: "DEMO101",
    name: courseA.cn,
    ename: courseA.en,
    valid: true,
    lastTerm: "演示秋季学期",
    dept: "演示学院",
    gradation: "专业基础",
    classify: null,
  },
  {
    number: "DEMO102",
    name: courseB.cn,
    ename: courseB.en,
    valid: false,
    lastTerm: "演示春季学期",
    dept: "演示学院",
    gradation: "专业选修",
    classify: null,
  },
];
const detail = (code: string) => ({
  code,
  name: {
    cn: code.startsWith("DEMO101") ? courseA.cn : courseB.cn,
    en: "Development fixture",
  },
  desc: { cn: "<p>这是开发演示课程，用于检查页面状态与交互。</p>" },
  credit: 3,
  hour: 60,
  dept: "演示学院",
  valid: code.startsWith("DEMO101"),
  courseCategory: "演示课程",
  lang: "中文",
});
const courseEntry = (course: typeof courseA, compulsory: boolean) => ({
  course: {
    code: course.code,
    nameZh: course.cn,
    nameEn: course.en,
    credits: 3,
    introduction: "<p>开发演示课程。</p>",
  },
  compulsory,
  terms: ["1秋"],
});
const shared = {
  self: {
    id: "demo-common",
    type: "演示公共模块",
    public: "demo-common",
    requiredCredits: 3,
    courses: [courseEntry(courseA, true)],
  },
  isLeaf: true,
};
const program = (newer: boolean) => ({
  grade: newer ? "2026" : "2025",
  trainType: "主修",
  department: { nameZh: "演示学院" },
  major: { nameZh: "演示专业" },
  requiredCredits: newer ? 6 : 3,
  beginSemester: "演示秋季学期",
  moduleTree: [
    {
      self: {
        id: "demo-holder",
        type: "演示公共模块",
        public: "demo-common",
        requiredCredits: 3,
        courses: [],
      },
      isLeaf: true,
    },
    ...(newer
      ? [
          {
            self: {
              id: "demo-added",
              type: "演示新增模块",
              requiredCredits: 3,
              courses: [courseEntry(courseB, false)],
            },
            isLeaf: true,
          },
        ]
      : []),
  ],
});
const lesson = (course: typeof courseA, index: number, previous = false) => ({
  id: `demo-lesson-${index}`,
  code: `${course.code}.01`,
  course,
  credits: 3,
  period: 60,
  dateTimePlacePersonText: {
    cn: `${previous ? "1~4" : "1~8"}周 演示教室A :2(${index === 1 ? "3,4" : "4,5"}) 演示教师${index}`,
  },
  stdCount: 20,
  limitCount: 30,
  openDepartment: { code: "DEMO", cn: "演示学院" },
  teacherAssignmentList: [{ cn: `演示教师${index}` }],
  education: { cn: "本科" },
  classType: { cn: "演示课堂" },
  courseCategory: { cn: "演示课程" },
  teachLang: { cn: "中文" },
  examMode: { cn: "演示考试方式" },
});
export function fixturePayload(path: string, body?: unknown): unknown {
  const url = new URL(path, "https://fixtures.invalid");
  const endpoint = url.pathname;
  if (endpoint === "/restricted") return { restricted: false };
  if (endpoint === "/teach/semester/list")
    return [
      {
        id: "demo-current",
        code: "DEMO2026",
        nameZh: "演示秋季学期",
        start: "2026-08-31",
        end: "2027-01-15",
        isLast: true,
      },
      {
        id: "demo-previous",
        code: "DEMO2025",
        nameZh: "演示春季学期",
        start: "2026-02-23",
        end: "2026-07-01",
        isLast: false,
      },
    ];
  if (endpoint === "/teach/department/college-tree")
    return [
      { id: "demo-college", code: "DEMO", nameZh: "演示学院", children: [] },
    ];
  if (endpoint === "/teach/course/search") {
    const keyword = (url.searchParams.get("keyword") ?? "").toLowerCase();
    return courseRows.filter((course) =>
      `${course.number} ${course.name} ${course.ename}`
        .toLowerCase()
        .includes(keyword),
    );
  }
  if (
    endpoint === "/teach/course/quality" ||
    endpoint.startsWith("/teach/course/department/")
  )
    return { 演示分类: courseRows };
  if (endpoint === "/teach/course/infos") {
    const codes =
      body &&
      typeof body === "object" &&
      "codes" in body &&
      Array.isArray(body.codes)
        ? body.codes
        : [];
    return codes
      .filter((code) => code === "DEMO101" || code === "DEMO102")
      .map(detail);
  }
  if (endpoint === "/teach/lesson/infos") {
    const codes =
      body &&
      typeof body === "object" &&
      "codes" in body &&
      Array.isArray(body.codes)
        ? body.codes
        : [];
    return codes
      .filter((code) => code === "DEMO101.01" || code === "DEMO102.01")
      .map(detail);
  }
  if (endpoint === "/teach/program/tree")
    return {
      demo: {
        id: "demo-college",
        nameZh: "演示学院",
        majors: {
          demo: {
            nameZh: "演示专业",
            programs: [
              {
                id: "demo-old",
                nameZh: "演示旧计划",
                grade: "2025",
                trainType: "主修",
              },
              {
                id: "demo-new",
                nameZh: "演示新计划",
                grade: "2026",
                trainType: "主修",
              },
            ],
          },
        },
      },
    };
  if (
    endpoint.startsWith("/teach/program/info/") &&
    !["demo-old", "demo-new"].includes(endpoint.split("/").at(-1)!)
  )
    throw new Error("演示资料未包含此计划。");
  if (
    (endpoint.includes("/list-for-teach/") ||
      endpoint.includes("/exam/list/") ||
      endpoint.includes("/general-exam/list/")) &&
    !["demo-current", "demo-previous"].includes(endpoint.split("/").at(-1)!)
  )
    throw new Error("演示资料未包含此学期。");
  if (endpoint.startsWith("/teach/program/info/"))
    return program(endpoint.endsWith("/demo-new"));
  if (endpoint === "/teach/course-module/info/demo-common") return shared;
  if (endpoint.startsWith("/teach/lesson/list-for-teach/"))
    return endpoint.endsWith("/demo-previous")
      ? [lesson(courseA, 1, true)]
      : [lesson(courseA, 1), lesson(courseB, 2)];
  if (endpoint.startsWith("/teach/general-exam/list/"))
    return [
      {
        id: "demo-general",
        courseCode: "DEMO101",
        courseName: courseA.cn,
        examDate: "2026-11-07T00:00:00+08:00",
        startTime: 900,
        endTime: 1100,
        room: "演示教室A",
        dept: "演示学院",
      },
    ];
  if (endpoint.startsWith("/teach/exam/list/"))
    return [courseA, courseB].map((course, index) => ({
      id: `demo-exam-${index}`,
      examDate: "2026-11-07",
      startTime: index ? 1000 : 900,
      endTime: 1100,
      examRooms: [{ room: "演示教室A" }],
      lesson: {
        code: `${course.code}.01`,
        course,
        openDepartment: { cn: "演示学院" },
      },
    }));
  if (endpoint.startsWith("/teach/timetable-public-all/"))
    return {
      timetable: {
        lessons: [
          {
            id: "demo-room",
            classroomName: "演示教室A",
            buildingCode: "DEMO",
            courseName: courseA.cn,
            start: "09:00",
            end: "10:00",
            capacity: 40,
            campus: "演示校区",
          },
        ],
        tmpLessons: [],
        roomOccupies: [],
        exams: [],
        makeupExams: [],
        tmpExams: [],
      },
    };
  if (endpoint === "/teach/course-substitute-pool/list")
    return [
      {
        id: "demo-substitute",
        substituteCourses: [courseB],
        originalCourses: [courseA],
        remark: "开发演示直接关系。",
      },
    ];
  throw new Error(`No fixture for ${endpoint}`);
}
