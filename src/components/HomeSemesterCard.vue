<script setup lang="ts">
import { CalendarDays, ArrowRight } from "@lucide/vue";
import type { Semester, QueryMeta } from "../domain/models";
import QueryState from "./QueryState.vue";
const props = defineProps<{
  semester?: Semester;
  loading?: boolean;
  error?: Error;
  meta?: QueryMeta;
}>();
defineEmits<{ retry: [] }>();
function link(path: string) {
  return props.semester
    ? { path, query: { semester: props.semester.id } }
    : { path };
}
</script>
<template>
  <aside class="semester-card" aria-label="当前学期与查询入口">
    <div class="semester-card-heading">
      <CalendarDays :size="18" /><span>当前学期</span
      ><span class="tag">公开安排</span>
    </div>
    <h2>
      {{ semester?.name ?? (loading ? "正在读取学期…" : "暂无学期资料") }}
    </h2>
    <div class="semester-links">
      <RouterLink :to="link('/lessons')"
        >查看本学期开课<ArrowRight :size="16"
      /></RouterLink>
      <RouterLink :to="link('/exams')"
        >查看考试安排<ArrowRight :size="16"
      /></RouterLink>
    </div>
    <QueryState
      :loading="loading"
      :error="error"
      :meta="meta"
      @retry="$emit('retry')"
    />
  </aside>
</template>
