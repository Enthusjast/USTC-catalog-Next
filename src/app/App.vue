<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookOpen, Search, Menu, X, Sun, Moon, ArrowUpRight, ChevronDown } from '@lucide/vue'
import { usePreferences } from '../features/usePreferences'

const route = useRoute(), router = useRouter(), { theme, toggleTheme } = usePreferences()
const menuOpen = ref(false), search = ref(''), renderError = ref(false)
const navigation = [{ path: '/courses', name: '课程目录' }, { path: '/programs', name: '培养方案' }, { path: '/lessons', name: '教学班' }, { path: '/exams', name: '考试' }, { path: '/classrooms', name: '教室' }, { path: '/substitutions', name: '替代课程' }]
function submitSearch() { if (search.value.trim()) void router.push({ path: '/search', query: { q: search.value.trim() } }) }
watch(() => route.fullPath, () => { menuOpen.value = false; renderError.value = false })
onErrorCaptured(() => { renderError.value = true; return false })
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="科大目录首页"><span class="brand-icon"><BookOpen :size="23" /></span><span><strong>科大目录<span class="brand-en"> / CATALOG</span></strong><small>非官方公共查询</small></span></RouterLink>
      <nav class="desktop-nav" aria-label="主要导航"><RouterLink v-for="item in navigation" :key="item.path" :to="item.path">{{ item.name }}</RouterLink></nav>
      <div class="header-actions">
        <RouterLink to="/search" class="icon-button" aria-label="全站搜索"><Search :size="19" /></RouterLink>
        <button class="icon-button" :aria-label="theme === 'dark' ? '切换浅色主题' : '切换深色主题'" @click="toggleTheme"><Sun v-if="theme === 'dark'" :size="19" /><Moon v-else :size="19" /></button>
        <details class="more-menu"><summary>更多<ChevronDown :size="14" /></summary><div><RouterLink to="/archives">历史归档</RouterLink><RouterLink to="/program-compare">计划对比</RouterLink><RouterLink to="/about/data">数据说明</RouterLink></div></details>
        <button class="icon-button mobile-menu-button" :aria-expanded="menuOpen" aria-controls="mobile-navigation" :aria-label="menuOpen ? '关闭导航' : '打开导航'" @click="menuOpen = !menuOpen"><X v-if="menuOpen" :size="22" /><Menu v-else :size="22" /></button>
      </div>
    </div>
    <nav v-if="menuOpen" id="mobile-navigation" class="mobile-nav" aria-label="移动端导航" @keydown.esc="menuOpen = false"><RouterLink v-for="item in navigation" :key="item.path" :to="item.path">{{ item.name }}</RouterLink><RouterLink to="/archives">历史归档</RouterLink><RouterLink to="/program-compare">计划对比</RouterLink><RouterLink to="/about/data">数据说明</RouterLink></nav>
  </header>
  <main id="main" class="main-container" tabindex="-1">
    <form v-if="route.path !== '/'" class="global-search" @submit.prevent="submitSearch"><label for="global-q"><Search :size="17" /><span class="sr-only">全站搜索</span></label><input id="global-q" v-model="search" type="search" placeholder="搜索课程、教师、院系或教室" /><button type="submit">搜索</button></form>
    <div v-if="renderError" class="panel empty-state" role="alert"><h1>页面暂时无法显示</h1><p>请重新打开页面，或查看数据说明。</p><a class="button" :href="route.fullPath ? `/#${route.fullPath}` : '/'" @click.prevent="router.go(0)">重新加载</a></div>
    <RouterView v-else />
  </main>
  <footer class="site-footer"><div class="footer-inner"><div><strong>科大目录</strong><p>独立公共查询工具，非中国科学技术大学官方系统。</p><p>公开信息可能次日更新，实际安排以综合教务系统为准。</p></div><nav aria-label="官方来源与站点信息"><a href="https://www.ustc.edu.cn/" target="_blank" rel="noopener noreferrer">中国科大主页<ArrowUpRight :size="13" /></a><a href="https://www.teach.ustc.edu.cn/" target="_blank" rel="noopener noreferrer">本科教育主页<ArrowUpRight :size="13" /></a><a href="https://jw.ustc.edu.cn/" target="_blank" rel="noopener noreferrer">综合教务系统<ArrowUpRight :size="13" /></a><RouterLink to="/about/data">数据来源与说明</RouterLink></nav></div><div class="footer-bottom">USTC CATALOG EXPLORER <span>公开数据 · 本地规划 · 无需账号</span></div></footer>
</template>
