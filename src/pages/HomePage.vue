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
import { useQuery } from "../features/useQuery";
import { catalog } from "../api/catalog";
import QueryState from "../components/QueryState.vue";
import CatalogSearch from "../components/CatalogSearch.vue";

const { data, meta, loading, error, reload } = useQuery((signal, force) =>
  catalog.semesters({ signal, force }),
);
const tasks = [
  {
    path: "/courses",
    icon: BookOpen,
    index: "01",
    title: "找一门课程",
    name: "课程目录",
    description: "检索课程名称与编号，了解课程内容和有效状态。",
  },
  {
    path: "/programs",
    icon: Layers,
    index: "02",
    title: "看培养方案",
    name: "培养方案",
    description: "按年级、院系和培养类型，浏览执行计划与课程模块。",
  },
  {
    path: "/lessons",
    icon: GraduationCap,
    index: "03",
    title: "安排候选课程",
    name: "全校教学班",
    description: "比较教师与上课时间，建立清单并检查公开安排冲突。",
  },
  {
    path: "/exams",
    icon: CalendarDays,
    index: "04",
    title: "查考试安排",
    name: "考试查询",
    description: "查询课程与通识考试，查看日期、时段和考场。",
  },
];
</script>
<template>
  <section class="home-hero">
    <div class="hero-topline">
      <p class="eyebrow">USTC CATALOG EXPLORER</p>
      <span class="tag">公开资料检索</span>
    </div>
    <h1>让课程信息，<br />更容易找到。</h1>
    <p class="hero-description">
      查课程、看培养方案、规划公开教学安排。<br
        class="mobile-break"
      />从一次搜索开始。
    </p>
    <CatalogSearch id="home-search" />
    <div class="search-hints">
      <span>搜索范围</span><span>课程目录</span><span>当前学期教学班</span
      ><span>培养计划</span>
    </div>
    <div class="hero-index" aria-hidden="true">
      <span>课程</span><span>计划</span><span>安排</span
      ><span class="index-line" />
    </div>
  </section>
  <section class="home-tasks">
    <div class="section-heading">
      <h2>从你要做的事开始</h2>
      <span>查询工作台 / EXPLORE</span>
    </div>
    <div class="task-grid">
      <RouterLink
        v-for="task in tasks"
        :key="task.path"
        :to="task.path"
        class="task-card"
        ><div class="task-top">
          <component :is="task.icon" :size="25" /><span>{{ task.index }}</span>
        </div>
        <h3>{{ task.title }}</h3>
        <p>{{ task.description }}</p>
        <div class="task-link">{{ task.name }}<ArrowRight :size="17" /></div
      ></RouterLink>
    </div>
  </section>
  <section class="secondary-tasks">
    <RouterLink to="/classrooms"
      ><MapPin :size="21" />
      <div><strong>教室使用</strong><span>查看公开占用与时段</span></div>
      <ArrowRight :size="17" /></RouterLink
    ><RouterLink to="/substitutions"
      ><ArrowLeftRight :size="21" />
      <div><strong>替代课程</strong><span>查找直接替代关系</span></div>
      <ArrowRight :size="17" /></RouterLink
    ><RouterLink to="/archives"
      ><Archive :size="21" />
      <div><strong>历史归档</strong><span>2013 级方案与官方资料</span></div>
      <ArrowRight :size="17"
    /></RouterLink>
  </section>
  <section class="home-data panel">
    <div class="home-data-title">
      <ShieldCheck :size="22" />
      <div>
        <h2>公开数据，清楚的来源</h2>
        <p>
          当前学期：{{
            data?.find((s) => s.current)?.name ??
            (loading ? "读取中" : "暂不可用")
          }}。查询时间表示浏览器读取接口的时间。
        </p>
      </div>
      <RouterLink to="/about/data"
        >了解数据说明<ArrowRight :size="16"
      /></RouterLink>
    </div>
    <QueryState
      :loading="loading"
      :error="error"
      :meta="meta"
      @retry="reload"
    />
  </section>
</template>
