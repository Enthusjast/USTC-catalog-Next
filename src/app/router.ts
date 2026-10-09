import { createRouter, createWebHashHistory } from "vue-router";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
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
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
});
router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? "公共查询")} · 科大目录`;
});
