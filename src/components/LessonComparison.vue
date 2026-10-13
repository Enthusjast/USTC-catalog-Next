<script setup lang="ts">
import { computed } from "vue";
import type { Lesson } from "../domain/models";
import { lessonConflicts } from "../domain/schedule";
const props = defineProps<{ lessons: Lesson[]; candidates: Lesson[] }>();
defineEmits<{ remove: [code: string]; close: []; detail: [code: string] }>();
const fields = [
  { label: "教师", value: (l: Lesson) => l.teachers.join("、") },
  { label: "时间与地点", value: (l: Lesson) => l.schedule.text },
  {
    label: "学分 / 学时",
    value: (l: Lesson) => `${l.credits ?? "未提供"} / ${l.hours ?? "未提供"}`,
  },
  {
    label: "人数 / 容量",
    value: (l: Lesson) => `${l.count ?? "未提供"} / ${l.capacity ?? "未提供"}`,
  },
  { label: "校区", value: (l: Lesson) => l.campus },
  { label: "授课语言", value: (l: Lesson) => l.language },
  { label: "考试方式", value: (l: Lesson) => l.examMode },
];
const overlaps = computed(
  () =>
    new Map(
      props.lessons.map((l) => [
        l.id,
        lessonConflicts([l, ...props.candidates.filter((c) => c.id !== l.id)])
          .overlaps.filter((p) => p.left.id === l.id)
          .map((p) => `${p.right.code}（${p.weeks.join("、")}周）`),
      ]),
    ),
);
</script>
<template>
  <section v-if="lessons.length" class="panel lesson-comparison">
    <div class="results-toolbar">
      <h2>同课程教学班对比</h2>
      <UiButton class="text-button" @click="$emit('close')">清空对比</UiButton>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>项目</th>
            <th v-for="lesson in lessons" :key="lesson.id">
              <UiButton
                class="course-name"
                @click="$emit('detail', lesson.code)"
              >
                {{ lesson.course.name }}</UiButton
              ><span class="mono">{{ lesson.code }}</span
              ><UiButton
                class="text-button"
                :aria-label="`移除对比 ${lesson.code}`"
                @click="$emit('remove', lesson.code)"
              >
                移除
              </UiButton>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in fields" :key="field.label">
            <th>{{ field.label }}</th>
            <td v-for="lesson in lessons" :key="lesson.id">
              {{ field.value(lesson) || "未提供" }}
            </td>
          </tr>
          <tr>
            <th>与当前方案重叠</th>
            <td v-for="lesson in lessons" :key="lesson.id">
              {{
                overlaps.get(lesson.id)?.join("；") ||
                (lesson.schedule.unknown ||
                candidates.some((c) => c.schedule.unknown)
                  ? "部分安排未知"
                  : "未发现时间重叠")
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
<style scoped>
.lesson-comparison {
  margin-top: 20px;
}
.lesson-comparison h2 {
  font-size: 18px;
}
.lesson-comparison td,
.lesson-comparison th {
  min-width: 160px;
  white-space: normal;
}
.lesson-comparison th:first-child {
  min-width: 120px;
}
.lesson-comparison .mono {
  display: block;
}
</style>
