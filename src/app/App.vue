<script setup lang="ts">
import { onErrorCaptured, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BookOpen,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUpRight,
  ChevronDown,
} from "@lucide/vue";
import { usePreferences } from "../features/usePreferences";
import { filterStorageError } from "../features/filterPreferences";
import { DEMO_MODE } from "../api/environment";

const route = useRoute(),
  router = useRouter(),
  { theme, toggleTheme } = usePreferences();
const menuOpen = ref(false),
  renderError = ref(false);
const navigation = [
  { path: "/courses", name: "课程目录" },
  { path: "/programs", name: "培养方案" },
  { path: "/lessons", name: "教学班" },
  { path: "/exams", name: "考试" },
  { path: "/classrooms", name: "教室" },
  { path: "/substitutions", name: "替代课程" },
];
function isCurrent(path: string) {
  return (
    route.path === path ||
    route.path.startsWith(`${path}/`) ||
    (path === "/programs" && route.path === "/program-compare")
  );
}
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
    renderError.value = false;
  },
);
onErrorCaptured(() => {
  renderError.value = true;
  return false;
});
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="USTC-catalog-Next 首页"
        ><span class="brand-icon"><BookOpen :size="23" /></span
        ><span
          ><strong>USTC-catalog-Next</strong
          ><small>科大课程与公开教学查询</small></span
        ></RouterLink
      >
      <nav class="desktop-nav" aria-label="主要导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="{ 'is-current': isCurrent(item.path) }"
          >{{ item.name }}</RouterLink
        >
      </nav>
      <div class="header-actions">
        <RouterLink to="/search" class="header-search" aria-label="全站搜索"
          ><Search :size="17" /><span>搜索课程、教师…</span></RouterLink
        >
        <button
          class="icon-button"
          :aria-label="theme === 'dark' ? '切换浅色主题' : '切换深色主题'"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" :size="19" /><Moon v-else :size="19" />
        </button>
        <details class="more-menu">
          <summary>更多<ChevronDown :size="14" /></summary>
          <div>
            <RouterLink to="/archives">历史归档</RouterLink
            ><RouterLink to="/program-compare">计划对比</RouterLink
            ><RouterLink to="/about/data">数据说明</RouterLink>
          </div>
        </details>
        <button
          class="icon-button mobile-menu-button"
          :aria-expanded="menuOpen"
          aria-controls="mobile-navigation"
          :aria-label="menuOpen ? '关闭导航' : '打开导航'"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="22" /><Menu v-else :size="22" />
        </button>
      </div>
    </div>
    <nav
      v-if="menuOpen"
      id="mobile-navigation"
      class="mobile-nav"
      aria-label="移动端导航"
      @keydown.esc="menuOpen = false"
    >
      <RouterLink
        v-for="item in navigation"
        :key="item.path"
        :to="item.path"
        :class="{ 'is-current': isCurrent(item.path) }"
        >{{ item.name }}</RouterLink
      ><RouterLink to="/archives">历史归档</RouterLink
      ><RouterLink to="/program-compare">计划对比</RouterLink
      ><RouterLink to="/about/data">数据说明</RouterLink>
    </nav>
    <p class="header-disclaimer">
      独立公共查询工具，非中国科学技术大学官方系统。
    </p>
  </header>
  <main id="main" class="main-container" tabindex="-1">
    <p v-if="DEMO_MODE" class="notice warning" role="status">
      演示模式：课程、计划与教学安排使用虚构示例；历史归档为标明来源的静态资料。演示收藏和候选清单独立保存。
    </p>
    <p v-if="filterStorageError" class="notice warning" role="status">
      {{ filterStorageError }}
    </p>
    <div v-if="renderError" class="panel empty-state" role="alert">
      <h1>页面暂时无法显示</h1>
      <p>请重新打开页面，或查看数据说明。</p>
      <a
        class="button"
        :href="route.fullPath ? `/#${route.fullPath}` : '/'"
        @click.prevent="router.go(0)"
        >重新加载</a
      >
    </div>
    <RouterView v-else />
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>USTC-catalog-Next</strong>
        <p>独立公共查询工具，非中国科学技术大学官方系统。</p>
        <p>公开信息可能次日更新，实际安排以综合教务系统为准。</p>
      </div>
      <nav aria-label="官方来源与站点信息">
        <a
          href="https://www.ustc.edu.cn/"
          target="_blank"
          rel="noopener noreferrer"
          >中国科大主页<ArrowUpRight :size="13" /></a
        ><a
          href="https://www.teach.ustc.edu.cn/"
          target="_blank"
          rel="noopener noreferrer"
          >本科教育主页<ArrowUpRight :size="13" /></a
        ><a
          href="https://jw.ustc.edu.cn/"
          target="_blank"
          rel="noopener noreferrer"
          >综合教务系统<ArrowUpRight :size="13" /></a
        ><RouterLink to="/about/data">数据来源与说明</RouterLink>
      </nav>
    </div>
    <div class="footer-bottom">
      USTC-catalog-Next <span>公开数据 · 本地规划 · 无需账号</span>
    </div>
  </footer>
</template>
