<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  Layers,
  CalendarDays,
  GraduationCap,
  MapPin,
  ArrowLeftRight,
  Archive,
  ShieldCheck,
} from "@lucide/vue";
import { computed } from "vue";
import { useQuery } from "../features/useQuery";
import { catalog } from "../api/catalog";
import HomeSemesterCard from "../components/HomeSemesterCard.vue";
import CatalogSearch from "../components/CatalogSearch.vue";

const { data, meta, loading, error, reload } = useQuery((signal, force) =>
  catalog.semesters({ signal, force }),
);
const currentSemester = computed(() =>
  data.value?.find((semester) => semester.current),
);
function semesterLink(path: string) {
  return currentSemester.value
    ? { path, query: { semester: currentSemester.value.id } }
    : { path };
}
const tasks = [
  {
    path: "/courses",
    icon: BookOpen,
    index: "01",
    title: "课程目录",
  },
  {
    path: "/programs",
    icon: Layers,
    index: "02",
    title: "培养计划",
  },
  {
    path: "/lessons",
    icon: GraduationCap,
    index: "03",
    title: "全校开课",
  },
  {
    path: "/exams",
    icon: CalendarDays,
    index: "04",
    title: "考试查询",
  },
];
</script>
<template>
  <section class="home-hero">
    <div class="hero-main">
      <h1>
        <span>课程与教学安排，</span
        ><span class="hero-headline-tail">一处查询。</span>
      </h1>
      <p class="hero-description">
        查课程内容、浏览培养计划，或按学期查看公开开课与考试安排。
      </p>
      <CatalogSearch id="home-search" />
      <div class="search-hints">
        <span>试试搜索</span>
        <RouterLink
          v-for="keyword in ['数学分析', 'MATH1006', '大学物理']"
          :key="keyword"
          :to="{ path: '/search', query: { q: keyword } }"
          >{{ keyword }}<ArrowRight :size="12"
        /></RouterLink>
      </div>
    </div>
    <HomeSemesterCard
      class="semester-desktop"
      :semester="currentSemester"
      :loading="loading"
      :error="error"
      :meta="meta"
      @retry="reload"
    />
  </section>
  <section class="home-tasks">
    <div class="section-heading">
      <h2>查询入口</h2>
    </div>
    <div class="task-grid">
      <RouterLink
        v-for="task in tasks"
        :key="task.path"
        :to="
          ['/lessons', '/exams'].includes(task.path)
            ? semesterLink(task.path)
            : task.path
        "
        class="task-card"
        ><div class="task-top">
          <component :is="task.icon" :size="21" /><span>{{ task.index }}</span>
        </div>
        <h3>{{ task.title }}</h3></RouterLink
      >
    </div>
  </section>
  <HomeSemesterCard
    class="semester-mobile"
    :semester="currentSemester"
    :loading="loading"
    :error="error"
    :meta="meta"
    @retry="reload"
  />
  <section class="secondary-tasks">
    <RouterLink to="/classrooms"
      ><MapPin :size="21" />
      <div><strong>教室使用</strong></div>
      <ArrowRight :size="17" /></RouterLink
    ><RouterLink to="/substitutions"
      ><ArrowLeftRight :size="21" />
      <div><strong>替代课程</strong></div>
      <ArrowRight :size="17" /></RouterLink
    ><RouterLink to="/archives"
      ><Archive :size="21" />
      <div><strong>历史归档</strong></div>
      <ArrowRight :size="17"
    /></RouterLink>
  </section>
  <section class="home-data panel">
    <div class="home-data-title">
      <ShieldCheck :size="22" />
      <div>
        <h2>查询前了解数据边界</h2>
        <p>
          课程有效不代表每学期开课；公开安排可能次日更新，实际安排以综合教务系统为准。
        </p>
      </div>
      <RouterLink to="/about/data"
        >了解数据说明<ArrowRight :size="16"
      /></RouterLink>
    </div>
  </section>
</template>
