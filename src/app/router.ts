import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('../pages/HomePage.vue'), meta: { title: '公共查询工作台' } },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})
router.afterEach(to => { document.title = `${String(to.meta.title ?? '公共查询')} · 科大目录` })
