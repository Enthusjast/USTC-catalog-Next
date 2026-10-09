<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, BookOpen, GraduationCap, Layers } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useFilter, useDebounced } from "../features/useFilters";
import { useQuery } from "../features/useQuery";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import EmptyState from "../components/EmptyState.vue";
import CatalogSearch from "../components/CatalogSearch.vue";
const q = useFilter("q"),
  keyword = useDebounced(q),
  enabled = computed(() => !!keyword.value.trim());
const courses = useQuery(
  (signal, force) => catalog.search(keyword.value.trim(), { signal, force }),
  keyword,
  enabled,
);
const programs = useQuery(
  (signal, force) => catalog.programs({ signal, force }),
  "tree",
  enabled,
);
const semesters = useQuery(
  (signal, force) => catalog.semesters({ signal, force }),
  "semesters",
  enabled,
);
const semester = computed(
  () =>
    semesters.data.value?.find((s) => s.current) ?? semesters.data.value?.[0],
);
const lessons = useQuery(
  (signal, force) => catalog.lessons(semester.value!.id, { signal, force }),
  () => semester.value?.id,
  () => enabled.value && !!semester.value,
);
const planResults = computed(() =>
  (programs.data.value ?? [])
    .filter((p) =>
      `${p.name} ${p.major} ${p.department} ${p.trainType}`
        .toLowerCase()
        .includes(keyword.value.toLowerCase()),
    )
    .slice(0, 6),
);
const lessonResults = computed(() =>
  (lessons.data.value ?? [])
    .filter((l) =>
      `${l.code} ${l.course.name} ${l.course.englishName ?? ""} ${l.department} ${l.teachers.join(" ")} ${l.schedule.text}`
        .toLowerCase()
        .includes(keyword.value.toLowerCase()),
    )
    .slice(0, 6),
);
</script>
<template>
  <PageHeading
    title="全站搜索"
    description="在课程目录、当前学期公开教学班和 API 执行计划中查找相关信息。"
    eyebrow="SEARCH / 全站检索"
  /><CatalogSearch id="page-search" :initial="q" />
  <div v-if="enabled" class="search-results">
    <section class="panel">
      <div class="results-toolbar">
        <strong class="flex-actions"><BookOpen :size="18" />课程目录</strong
        ><RouterLink
          class="text-button"
          :to="{ path: '/courses', query: { q: keyword, history: '1' } }"
          >查看全部<ArrowRight :size="15"
        /></RouterLink>
      </div>
      <div class="search-result-body">
        <QueryState
          :loading="courses.loading.value"
          :error="courses.error.value"
          :meta="courses.meta.value"
          @retry="courses.reload"
        /><RouterLink
          v-for="course in courses.data.value?.slice(0, 6)"
          :key="course.code"
          class="search-result-item"
          :to="{
            path: '/courses',
            query: { q: course.code, course: course.code, history: '1' },
          }"
          ><span class="mono muted">{{ course.code }}</span
          ><strong>{{ course.name }}</strong
          ><span class="tag" :class="course.valid ? 'valid' : 'warning'">{{
            course.valid ? "有效" : "历史"
          }}</span></RouterLink
        ><EmptyState
          v-if="courses.data.value && !courses.data.value.length"
          message="尝试课程编号、简称或英文名称。"
        />
      </div>
    </section>
    <section class="panel">
      <div class="results-toolbar">
        <strong class="flex-actions"
          ><GraduationCap :size="18" />公开教学班</strong
        ><RouterLink
          class="text-button"
          :to="{
            path: '/lessons',
            query: { q: keyword, semester: semester?.id },
          }"
          >查看全部<ArrowRight :size="15"
        /></RouterLink>
      </div>
      <div class="search-result-body">
        <QueryState
          :loading="semesters.loading.value"
          :error="semesters.error.value"
          @retry="semesters.reload"
        /><QueryState
          :loading="lessons.loading.value"
          :error="lessons.error.value"
          :meta="lessons.meta.value"
          @retry="lessons.reload"
        /><RouterLink
          v-for="lesson in lessonResults"
          :key="lesson.id"
          class="search-result-item"
          :to="{
            path: '/lessons',
            query: { q: lesson.code, semester: semester?.id },
          }"
          ><span class="mono muted">{{ lesson.code }}</span
          ><strong>{{ lesson.course.name }}</strong
          ><span class="muted">{{
            lesson.teachers.join("、")
          }}</span></RouterLink
        ><EmptyState
          v-if="lessons.data.value && !lessonResults.length"
          message="当前学期未找到相关教学班，尝试切换学期或修改教师、地点关键词。"
        />
      </div>
    </section>
    <section class="panel">
      <div class="results-toolbar">
        <strong class="flex-actions"><Layers :size="18" />执行计划</strong
        ><RouterLink
          class="text-button"
          :to="{ path: '/programs', query: { q: keyword } }"
          >查看全部<ArrowRight :size="15"
        /></RouterLink>
      </div>
      <div class="search-result-body">
        <QueryState
          :loading="programs.loading.value"
          :error="programs.error.value"
          :meta="programs.meta.value"
          @retry="programs.reload"
        /><RouterLink
          v-for="plan in planResults"
          :key="plan.id"
          class="search-result-item"
          :to="`/programs/${plan.id}`"
          ><span class="tag">{{ plan.grade }} 级</span
          ><strong>{{ plan.name }}</strong
          ><span class="muted">{{ plan.trainType }}</span></RouterLink
        ><EmptyState
          v-if="programs.data.value && !planResults.length"
          message="尝试专业、培养类型或院系名称。"
        />
      </div>
    </section>
  </div>
  <EmptyState
    v-else
    title="输入关键词开始检索"
    message="例如课程名称、课程编号、教师姓名、院系或教室编号。"
  />
</template>
