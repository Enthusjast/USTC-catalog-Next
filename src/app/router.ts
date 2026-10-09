import { createRouter, createWebHashHistory } from "vue-router";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/lessons",
      component: () => import("../pages/LessonsPage.vue"),
      meta: { title: "全校教学班" },
    },
    {
      path: "/exams",
      component: () => import("../pages/ExamsPage.vue"),
      meta: { title: "考试查询" },
    },
    {
      path: "/classrooms",
      component: () => import("../pages/ClassroomsPage.vue"),
      meta: { title: "教室使用" },
    },
    {
      path: "/substitutions",
      component: () => import("../pages/SubstitutionsPage.vue"),
      meta: { title: "替代课程" },
    },
    {
      path: "/archives",
      component: () => import("../pages/ArchivesPage.vue"),
      meta: { title: "历史归档" },
    },
    {
      path: "/about/data",
      component: () => import("../pages/DataPage.vue"),
      meta: { title: "数据说明" },
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("../pages/NotFoundPage.vue"),
      meta: { title: "页面不存在" },
    },
    {
      path: "/",
      component: () => import("../pages/HomePage.vue"),
      meta: { title: "公共查询工作台" },
    },
    {
      path: "/search",
      component: () => import("../pages/SearchPage.vue"),
      meta: { title: "全站搜索" },
    },
    {
      path: "/courses",
      component: () => import("../pages/CoursesPage.vue"),
      meta: { title: "课程目录" },
    },
    {
      path: "/programs",
      component: () => import("../pages/ProgramsPage.vue"),
      meta: { title: "培养方案" },
    },
    {
      path: "/programs/:id",
      component: () => import("../pages/ProgramDetailPage.vue"),
      meta: { title: "计划详情" },
    },
    {
      path: "/program-compare",
      component: () => import("../pages/ProgramComparePage.vue"),
      meta: { title: "计划对比" },
    },
  ],
  scrollBehavior: (to, from, saved) =>
    saved ?? (to.path === from.path ? false : { top: 0 }),
});
router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? "公共查询")} · 科大目录`;
});
