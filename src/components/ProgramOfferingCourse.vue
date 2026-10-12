<script setup lang="ts">
import { computed, ref, watch, nextTick, useId } from "vue";
import type { ProgramCourse, Lesson } from "../domain/models";
import LessonList from "./LessonList.vue";
import Pagination from "./Pagination.vue";
const props = defineProps<{
  entry: ProgramCourse;
  lessons: Lesson[];
  candidateIds: Set<string>;
  semester: string;
  open: boolean;
  resolved: boolean;
  error?: Error;
  detailCode: string;
}>();
const emit = defineEmits<{
  toggle: [open: boolean];
  course: [code: string];
  detail: [code: string];
  candidate: [lesson: Lesson, desired: boolean];
}>();
const page = ref(1),
  host = ref<HTMLElement>(),
  id = useId();
const current = computed(() =>
    Math.min(page.value, Math.max(1, Math.ceil(props.lessons.length / 25))),
  ),
  visible = computed(() =>
    props.lessons.slice((current.value - 1) * 25, current.value * 25),
  );
watch(
  () => props.semester,
  () => {
    page.value = 1;
  },
);
watch(
  [() => props.detailCode, () => props.lessons],
  async () => {
    const index = props.lessons.findIndex((l) => l.code === props.detailCode);
    if (index < 0) return;
    page.value = Math.floor(index / 25) + 1;
    await nextTick();
    const target = [
      ...(host.value?.querySelectorAll<HTMLElement>(".course-code") ?? []),
    ].find((el) => el.textContent?.trim() === props.detailCode);
    target?.scrollIntoView({ block: "nearest" });
  },
  { immediate: true, flush: "post" },
);
function toggle(event: Event) {
  const value = (event.target as HTMLDetailsElement).open;
  if (value !== props.open) emit("toggle", value);
}
</script>
<template>
  <article ref="host" class="program-offering-course">
    <h3>
      <span class="mono">{{ entry.course.code }}</span
      ><button class="course-name" @click="$emit('course', entry.course.code)">
        {{ entry.course.name }}
      </button>
    </h3>
    <p class="muted">
      {{
        entry.compulsory === undefined
          ? "课程属性未提供"
          : entry.compulsory
            ? "必修"
            : "选修"
      }}
      · {{ entry.terms.join("、") || "建议学期未提供" }}
    </p>
    <p v-if="entry.remark">{{ entry.remark }}</p>
    <details v-if="lessons.length" :open="open" @toggle="toggle">
      <summary :aria-controls="id">{{ lessons.length }} 个教学班</summary>
      <div v-if="open" :id="id">
        <LessonList
          :lessons="visible"
          :candidate-ids="candidateIds"
          :semester="semester"
          :compare-codes="[]"
          :show-compare="false"
          @detail="$emit('detail', $event)"
          @candidate="(lesson, desired) => $emit('candidate', lesson, desired)"
        />
        <Pagination
          :total="lessons.length"
          :page="current"
          @change="page = $event"
        />
      </div>
    </details>
    <p v-else-if="resolved && !error" class="muted">未找到公开开课</p>
    <p v-else-if="error" class="muted">开课状态未知</p>
  </article>
</template>
<style scoped>
.program-offering-course {
  margin-top: 20px;
}
h3 {
  font-size: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.course-name {
  margin: 0;
}
summary {
  min-height: 44px;
  padding: 8px 0;
  color: var(--primary);
}
</style>
