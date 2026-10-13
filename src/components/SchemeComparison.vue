<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { usePlanner } from "../features/usePlanner";
import { schemeStats, compareSchemes } from "../domain/schemeComparison";
import { weekdays } from "../domain/schedule";
import { lessonLink } from "../domain/queryLinks";
import DisclosureDialog from "./DisclosureDialog.vue";
const props = defineProps<{
    planner: ReturnType<typeof usePlanner>;
    semester: string;
  }>(),
  open = ref(false),
  left = ref(""),
  right = ref(""),
  week = ref(1);
const a = computed(() =>
    props.planner.schemes.value.find((s) => s.id === left.value),
  ),
  b = computed(() =>
    props.planner.schemes.value.find((s) => s.id === right.value),
  );
const comparison = computed(() =>
    a.value && b.value ? compareSchemes(a.value, b.value) : undefined,
  ),
  stats = computed(() =>
    [a.value, b.value].map((s) =>
      s
        ? schemeStats(
            s,
            Math.max(1, Math.min(53, Math.floor(Number(week.value) || 1))),
          )
        : undefined,
    ),
  );
function begin() {
  left.value = props.planner.activeSchemeId.value;
  right.value =
    props.planner.schemes.value.find((s) => s.id !== left.value)?.id ?? "";
  open.value = true;
}
function courseName(code: string) {
  return (
    b.value?.lessons.find((l) => l.course.code === code)?.course.name ??
    a.value?.lessons.find((l) => l.course.code === code)?.course.name ??
    code
  );
}
watch(
  () => props.semester,
  () => {
    open.value = false;
  },
);
</script>
<template>
  <UiButton
    class="text-button"
    :disabled="planner.schemes.value.length < 2"
    @click="begin"
  >
    对比方案
  </UiButton>
  <DisclosureDialog
    :open="open"
    title="同学期候选方案对比"
    @close="open = false"
    ><div class="scheme-comparison-controls">
      <label for="scheme-left">原方案</label
      ><UiSelect id="scheme-left" v-model="left">
        <option
          v-for="scheme in planner.schemes.value"
          :key="scheme.id"
          :value="scheme.id"
        >
          {{ scheme.name }}
        </option></UiSelect
      ><label for="scheme-right">目标方案</label
      ><UiSelect id="scheme-right" v-model="right">
        <option
          v-for="scheme in planner.schemes.value"
          :key="scheme.id"
          :value="scheme.id"
        >
          {{ scheme.name }}
        </option></UiSelect
      ><label for="scheme-compare-week">教学周</label
      ><UiInput
        id="scheme-compare-week"
        v-model.number="week"
        type="number"
        min="1"
        max="53"
      />
    </div>
    <template v-if="comparison && a && b"
      ><div class="table-scroll">
        <table class="scheme-stats">
          <thead>
            <tr>
              <th>项目</th>
              <th>{{ a.name }}</th>
              <th>{{ b.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>课程数</th>
              <td v-for="(stat, i) in stats" :key="i">{{ stat?.courses }}</td>
            </tr>
            <tr>
              <th>已知课程学分</th>
              <td v-for="(stat, i) in stats" :key="i">
                {{ stat?.credits }}
                <p v-if="stat?.unknownCredits.length">
                  缺失或不一致：{{ stat.unknownCredits.join("、") }}
                </p>
              </td>
            </tr>
            <tr>
              <th>全学期冲突</th>
              <td v-for="(stat, i) in stats" :key="i">
                {{ stat?.conflicts.overlaps.length }} 组，{{
                  stat?.conflicts.unknown.length
                }}
                项安排未知
              </td>
            </tr>
            <tr>
              <th>首周日期</th>
              <td>{{ a.calendar.firstMonday || "未设置" }}</td>
              <td>{{ b.calendar.firstMonday || "未设置" }}</td>
            </tr>
            <tr v-for="(day, index) in weekdays" :key="day">
              <th>周{{ day }}课节／重叠</th>
              <td v-for="(stat, i) in stats" :key="i">
                {{ stat?.days[index]?.occupied }} /
                {{ stat?.days[index]?.overlapping }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <section
        v-for="item in [
          { title: '新增课程', rows: comparison.added },
          { title: '移除课程', rows: comparison.removed },
          { title: '教学班或安排变化', rows: comparison.changed },
        ]"
        :key="item.title"
      >
        <h3>{{ item.title }}</h3>
        <p v-if="!item.rows.length" class="muted">无变化</p>
        <p
          v-for="code in item.title === '教学班或安排变化' ? [] : item.rows"
          :key="code"
        >
          <RouterLink
            :to="{
              path: '/courses',
              query: { q: code, course: code, history: '1' },
            }"
            >{{ courseName(code) }} · {{ code }}</RouterLink
          >
        </p>
        <div
          v-if="item.title === '教学班或安排变化'"
          class="scheme-changed-courses"
        >
          <article v-for="code in item.rows" :key="code">
            <h4>
              <RouterLink
                :to="{
                  path: '/courses',
                  query: { q: code, course: code, history: '1' },
                }"
                >{{ courseName(code) }} · {{ code }}</RouterLink
              >
            </h4>
            <div class="scheme-change-classes">
              <div v-for="scheme in [a, b]" :key="scheme.id">
                <strong>{{ scheme.name }}</strong>
                <div
                  v-for="lesson in scheme.lessons.filter(
                    (l) => l.course.code === code,
                  )"
                  :key="lesson.id"
                >
                  <RouterLink
                    class="text-button mono"
                    :to="lessonLink(semester, lesson.code)"
                    >{{ lesson.code }}</RouterLink
                  >
                  <p>
                    {{ lesson.teachers.join("、") || "教师未提供" }} ·
                    {{ lesson.credits ?? "未提供" }} 学分 /
                    {{ lesson.hours ?? "未提供" }} 学时
                  </p>
                  <p>{{ lesson.schedule.text || "安排未提供" }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </DisclosureDialog>
</template>
<style scoped>
.scheme-comparison-controls {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}
.scheme-stats {
  width: 100%;
}
.scheme-stats td {
  white-space: normal;
  overflow-wrap: anywhere;
  min-width: 100px;
}
.scheme-stats th {
  white-space: normal;
}
.scheme-stats th:first-child {
  min-width: 80px;
}
section {
  margin: 16px 0;
}
h3 {
  font-size: 16px;
}
.scheme-change-classes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.scheme-changed-courses article {
  margin: 16px 0;
  overflow-wrap: anywhere;
}
.scheme-change-classes p {
  white-space: pre-wrap;
}
@media (max-width: 480px) {
  .scheme-change-classes {
    grid-template-columns: 1fr;
  }
}
</style>
