<script setup lang="ts">
import { computed } from "vue";
import { ExternalLink } from "@lucide/vue";
import { icourseLink, type ReviewedLesson } from "../domain/icourse";
import { useIcourseLinks } from "../features/useIcourseLinks";
const props = withDefaults(
  defineProps<{ lesson: ReviewedLesson; variant?: "inline" | "button" }>(),
  { variant: "inline" },
);
const index = useIcourseLinks(),
  link = computed(() => icourseLink(props.lesson, index.value)),
  accessibleName = computed(
    () =>
      `${props.lesson.course.name}（${props.lesson.teachers.join("、") || "教师未提供"}）：${link.value.label}（新窗口打开）`,
  );
</script>
<template>
  <a
    class="icourse-link"
    :class="variant === 'button' ? 'button secondary' : 'text-button'"
    :href="link.url"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="accessibleName"
    >{{ link.label }}<ExternalLink :size="14" aria-hidden="true"
  /></a>
</template>
<style scoped>
.icourse-link.text-button {
  margin-top: 4px;
  min-height: 32px;
  font-size: 13px;
}
@media (pointer: coarse) {
  .icourse-link.text-button {
    min-height: 44px;
  }
}
</style>
