<script setup lang="ts">
import { computed } from "vue";
import { Bookmark, ArrowRight } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFavorites } from "../features/useFavorites";
import type { Course } from "../domain/models";
import DisclosureDialog from "./DisclosureDialog.vue";
import QueryState from "./QueryState.vue";
import CourseContent from "./CourseContent.vue";
import CourseRelations from "./CourseRelations.vue";
import { workspaceBusy } from "../features/useWorkspace";
import FavoriteEditor from "./FavoriteEditor.vue";
import { selectionIntent } from "../domain/selectionIntent";
const props = defineProps<{ code: string; initial?: Course }>();
defineEmits<{ close: [] }>();
const { favorites, toggle, storageError } = useFavorites();
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) => catalog.course(props.code, { signal, force }),
  () => props.code,
  () => !!props.code,
);
const course = computed(() => data.value?.[0] ?? props.initial);
</script>
<template>
  <DisclosureDialog :open="!!code" title="课程详情" @close="$emit('close')"
    ><QueryState
      :loading="loading"
      :meta="meta"
      :error="error"
      @retry="reload" />
    <div class="detail-title">
      <span class="mono muted">{{ code }}</span>
      <h3>{{ course?.name ?? code }}</h3>
      <p v-if="course?.englishName">{{ course.englishName }}</p>
    </div>
    <div class="flex-actions">
      <VarChip
        size="small"
        :elevation="false"
        v-if="course?.valid !== undefined"
        class="tag"
        :class="course.valid ? 'valid' : 'warning'"
        >{{ course.valid ? "当前有效" : "历史课程" }}</VarChip
      ><UiButton
        class="button small secondary"
        :disabled="workspaceBusy"
        :aria-pressed="favorites.includes(code)"
        @click="toggle(code, selectionIntent($event))"
      >
        <Bookmark :size="16" />{{
          favorites.includes(code) ? "已收藏" : "收藏课程"
        }}
      </UiButton>
    </div>
    <p v-if="storageError" class="notice warning">{{ storageError }}</p>
    <FavoriteEditor v-if="favorites.includes(code)" :code="code" />
    <dl v-if="course" class="detail-grid" style="margin-top: 24px">
      <div v-if="course.department">
        <dt>所属院系</dt>
        <dd>{{ course.department }}</dd>
      </div>
      <div>
        <dt>最近开课学期</dt>
        <dd>{{ course.lastTerm ?? "暂无记录" }}</dd>
      </div>
      <div v-if="course.credits !== undefined">
        <dt>学分</dt>
        <dd>{{ course.credits }}</dd>
      </div>
      <div v-if="course.hours !== undefined">
        <dt>学时</dt>
        <dd>{{ course.hours }}</dd>
      </div>
      <div v-if="course.category">
        <dt>课程类别</dt>
        <dd>{{ course.category }}</dd>
      </div>
      <div v-if="course.examMode">
        <dt>考试方式</dt>
        <dd>{{ course.examMode }}</dd>
      </div>
      <div v-if="course.language">
        <dt>授课语言</dt>
        <dd>{{ course.language }}</dd>
      </div>
    </dl>
    <CourseContent :course="course" :loading="loading" />
    <p v-if="data && !data.length" class="notice">
      接口未提供该课程的详情。可通过课程目录和公开教学班继续查询。
    </p>
    <div class="flex-actions">
      <RouterLink
        class="button secondary"
        :to="{ path: '/lessons', query: { q: code } }"
        >相关公开教学班<ArrowRight :size="16" /></RouterLink
      ><RouterLink
        class="button secondary"
        :to="{ path: '/programs', query: { q: course?.department } }"
        >浏览培养计划<ArrowRight :size="16"
      /></RouterLink>
    </div>
    <p class="muted" style="font-size: 12px; margin-top: 20px">
      课程目录中的有效状态不表示每学期均开课。
    </p>
    <CourseRelations v-if="code" :code="code" :department="course?.department"
  /></DisclosureDialog>
</template>
