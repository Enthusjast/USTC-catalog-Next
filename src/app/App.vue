<script setup lang="ts">
import {
  onErrorCaptured,
  onMounted,
  onBeforeUnmount,
  nextTick,
  ref,
  watch,
} from "vue";
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
  renderError = ref(false),
  header = ref<HTMLElement>(),
  mobileMenuButton = ref<HTMLButtonElement>(),
  mobileNavigation = ref<HTMLElement>(),
  moreMenu = ref<HTMLDetailsElement>();
function closeMenus(event: PointerEvent) {
  const target = event.target as Node;
  if (!header.value?.contains(target)) menuOpen.value = false;
  if (!moreMenu.value?.contains(target))
    moreMenu.value?.removeAttribute("open");
}
function escapeMenus(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  if (menuOpen.value) {
    menuOpen.value = false;
    mobileMenuButton.value?.focus();
  }
  if (moreMenu.value?.open) {
    moreMenu.value.open = false;
    moreMenu.value.querySelector<HTMLElement>("summary")?.focus();
  }
}
let navigationReady = false;
onMounted(async () => {
  document.addEventListener("pointerdown", closeMenus);
  document.addEventListener("keydown", escapeMenus);
  await router.isReady();
  navigationReady = true;
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeMenus);
  document.removeEventListener("keydown", escapeMenus);
});
watch(menuOpen, async (open) => {
  if (open) {
    await nextTick();
    const current =
      mobileNavigation.value?.querySelector<HTMLElement>("a.is-current") ??
      mobileNavigation.value?.querySelector<HTMLElement>("a");
    current?.focus();
  }
});
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
    if (moreMenu.value) moreMenu.value.open = false;
    renderError.value = false;
  },
);
watch(
  () => route.path,
  async () => {
    if (!navigationReady) return;
    await nextTick();
    document.getElementById("main")?.focus({ preventScroll: true });
  },
);
onErrorCaptured(() => {
  renderError.value = true;
  return false;
});
function skipToMain() {
  const main = document.getElementById("main");
  main?.scrollIntoView({ block: "start" });
  main?.focus({ preventScroll: true });
}
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="skipToMain">跳到主要内容</a>
  <header ref="header" class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="USTC-catalog-Next 首页"
        ><span class="brand-icon"><BookOpen :size="23" /></span
        ><span
          ><strong>USTC-catalog-Next</strong
          ><small>新一代公共查询</small></span
        ></RouterLink
      >
      <nav class="desktop-nav" aria-label="主要导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="{ 'is-current': isCurrent(item.path) }"
          :aria-current="isCurrent(item.path) ? 'page' : undefined"
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
        <details ref="moreMenu" class="more-menu">
          <summary>更多<ChevronDown :size="14" /></summary>
          <div>
            <RouterLink to="/archives">历史归档</RouterLink
            ><RouterLink to="/program-compare">计划对比</RouterLink
            ><RouterLink to="/about/data">数据说明</RouterLink>
          </div>
        </details>
        <button
          ref="mobileMenuButton"
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
      ref="mobileNavigation"
      id="mobile-navigation"
      class="mobile-nav"
      aria-label="移动端导航"
    >
      <RouterLink
        v-for="item in navigation"
        :key="item.path"
        :to="item.path"
        :class="{ 'is-current': isCurrent(item.path) }"
        :aria-current="isCurrent(item.path) ? 'page' : undefined"
        >{{ item.name }}</RouterLink
      ><RouterLink to="/archives">历史归档</RouterLink
      ><RouterLink to="/program-compare">计划对比</RouterLink
      ><RouterLink to="/about/data">数据说明</RouterLink>
    </nav>
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
        <p>新一代中国科学技术大学公共查询工具</p>
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
        ><RouterLink to="/about/data">站点说明</RouterLink>
      </nav>
    </div>
    <div class="footer-bottom">
      USTC-catalog-Next <span>公开数据 · 本地规划 · 无需账号</span>
    </div>
  </footer>
</template>
