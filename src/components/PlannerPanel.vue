<script setup lang="ts">
import { ref } from "vue";
import { Trash2, AlertTriangle, Download } from "@lucide/vue";
import type { Lesson } from "../domain/models";
import type { usePlanner } from "../features/usePlanner";
import { lessonConflicts, formatClock, clockMinutes } from "../domain/schedule";
import { lessonCalendar, downloadCalendar } from "../domain/calendar";
import { periodLayouts } from "../domain/periods";
import SchemeSelector from "./SchemeSelector.vue";
import CandidateUpdatePreview from "./CandidateUpdatePreview.vue";
import { workspaceBusy } from "../features/useWorkspace";
const props = defineProps<{
  planner: ReturnType<typeof usePlanner>;
  data?: Lesson[];
  semester: string;
  conflicts: ReturnType<typeof lessonConflicts>;
}>();
defineEmits<{
  detail: [code: string];
  candidate: [lesson: Lesson];
  results: [];
}>();
const heading = ref<HTMLElement>(),
  exportMessage = ref("");
const firstMonday = props.planner.firstMonday,
  layout = props.planner.layout;
defineExpose({
  focus: () => {
    heading.value?.scrollIntoView({ block: "start" });
    heading.value?.focus({ preventScroll: true });
  },
});
function exportICS() {
  try {
    const result = lessonCalendar(
      props.planner.lessons.value,
      firstMonday.value,
      layout.value,
    );
    if (result.count)
      downloadCalendar(result.content, `ustc-lessons-${props.semester}.ics`);
    exportMessage.value = `已导出 ${result.count} 个事件${result.skipped.length ? `；跳过无法识别的安排：${result.skipped.join("、")}` : ""}。`;
  } catch (error) {
    exportMessage.value = (error as Error).message;
  }
}
</script>
<template>
  <section class="planner-panel panel">
    <div class="section-heading">
      <h2 ref="heading" class="planner-heading" tabindex="-1">
        本机候选清单
        <span class="muted">{{ planner.lessons.value.length }}</span>
      </h2>
      <div class="flex-actions">
        <button class="text-button" @click="$emit('results')">继续查找</button>
        <button
          v-if="planner.lessons.value.length"
          class="text-button"
          @click="planner.clear"
          :disabled="workspaceBusy"
        >
          <Trash2 :size="15" />清空当前方案
        </button>
      </div>
    </div>
    <SchemeSelector :planner="planner" />
    <p v-if="planner.storageError.value" class="notice warning">
      {{ planner.storageError.value }}
    </p>
    <div
      v-for="lesson in planner.lessons.value"
      :key="lesson.id"
      class="candidate-row"
    >
      <button class="course-name" @click="$emit('detail', lesson.code)">
        {{ lesson.course.name
        }}<span class="mono">{{ lesson.code }}</span></button
      ><span class="muted">{{ lesson.teachers.join("、") }}</span
      ><button
        class="icon-button"
        :aria-label="`移除候选 ${lesson.course.name}`"
        @click="$emit('candidate', lesson)"
      >
        <Trash2 :size="16" />
      </button>
    </div>
    <p v-if="!planner.lessons.value.length" class="muted planner-note">
      点击教学班旁的“候选”按钮，开始整理清单；加入后可在结果上方直接进入管理。
    </p>
    <template v-if="planner.lessons.value.length"
      ><CandidateUpdatePreview :planner="planner" :semester="semester" />
      <div
        v-for="overlap in conflicts.overlaps"
        :key="`${overlap.left.id}:${overlap.right.id}`"
        class="notice error"
      >
        <AlertTriangle :size="18" />
        <p>
          公开安排存在时间重叠：{{ overlap.left.course.name }} 与
          {{ overlap.right.course.name }}，第
          {{ overlap.weeks.join("、") }} 周。
        </p>
      </div>
      <p v-if="conflicts.unknown.length" class="notice warning">
        无法判断完整冲突：{{
          conflicts.unknown.map((l) => l.code).join("、")
        }}。周课表仅展示其中已识别的时间。
      </p>
      <p
        v-if="!conflicts.overlaps.length && !conflicts.unknown.length"
        class="notice"
      >
        已识别的公开安排中未发现时间重叠。
      </p>
      <div class="ics-settings">
        <div class="filter-field">
          <label for="planner-start">第 1 教学周的周一日期</label
          ><input id="planner-start" v-model="firstMonday" type="date" />
        </div>
        <div class="filter-field">
          <label for="planner-layout">日历时间方式</label
          ><select id="planner-layout" v-model="layout">
            <option value="">全天提醒（含课节说明）</option>
            <option value="1">课节表 1（第 1 节 07:50）</option>
            <option value="2">课节表 2（第 1 节 08:00）</option>
          </select>
        </div>
        <button
          class="button secondary"
          :disabled="!firstMonday"
          @click="exportICS"
        >
          <Download :size="16" />导出 ICS
        </button>
      </div>
      <details v-if="layout" class="period-preview">
        <summary>核对所选课节表</summary>
        <p v-for="(times, i) in periodLayouts[layout]" :key="i">
          第 {{ i }} 节：{{ formatClock(clockMinutes(times[0])) }}–{{
            formatClock(clockMinutes(times[1]))
          }}
        </p>
      </details>
      <p v-if="exportMessage" class="notice" role="status">
        {{ exportMessage }}
      </p></template
    >
  </section>
</template>
