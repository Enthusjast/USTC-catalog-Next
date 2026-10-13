<script setup lang="ts">
import { weekdays } from "../domain/schedule";
import type { useLessonTimetable } from "../features/useLessonTimetable";
import type { usePlanner } from "../features/usePlanner";
import CalendarSettings from "./CalendarSettings.vue";
import SchemeSelector from "./SchemeSelector.vue";
import TimetableExport from "./TimetableExport.vue";
import WeekTimetable from "./WeekTimetable.vue";
const props = defineProps<{
  state: ReturnType<typeof useLessonTimetable>;
  planner: ReturnType<typeof usePlanner>;
}>();
defineEmits<{ detail: [code: string] }>();
const {
  week,
  currentWeek,
  timetableSource,
  timetableMode,
  timetableDay,
  timetableLessons,
  timetableExportData,
  thisWeek,
  jumpToday,
} = props.state;
</script>
<template>
  <div class="week-controls">
    <label for="planner-week">教学周</label
    ><UiSelect id="planner-week" v-model="week" class="field-input">
      <option v-for="w in 53" :key="w" :value="String(w)">第 {{ w }} 周</option>
    </UiSelect>
    <UiButton class="text-button" :disabled="!thisWeek" @click="jumpToday()">
      跳到本周</UiButton
    ><UiButton
      class="text-button"
      :disabled="!thisWeek"
      @click="jumpToday(true)"
    >
      今天
    </UiButton>
    <p class="week-planner-link">
      欲进行详细排课, 请前往
      <a
        href="https://class-arrange.raymondzylei.me/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Raymond 的排课工具（新窗口打开）"
        >Raymond 的排课工具</a
      >
    </p>
    <label for="timetable-source">课表来源</label
    ><UiSelect
      id="timetable-source"
      v-model="timetableSource"
      class="field-input"
    >
      <option value="candidates">候选方案</option>
      <option value="results">查询结果</option>
    </UiSelect>
    <label for="timetable-mode">视图</label
    ><UiSelect id="timetable-mode" v-model="timetableMode" class="field-input">
      <option value="week">完整周</option>
      <option value="day">单日</option>
    </UiSelect>
    <UiSelect
      v-if="timetableMode === 'day'"
      v-model="timetableDay"
      class="field-input"
      aria-label="课表星期"
    >
      <option v-for="(d, i) in weekdays" :key="d" :value="String(i + 1)">
        周{{ d }}
      </option>
    </UiSelect>
  </div>
  <SchemeSelector v-if="timetableSource !== 'results'" :planner="planner" />
  <details class="calendar-control">
    <summary>日历设置</summary>
    <CalendarSettings :planner="planner" prefix="week-calendar" />
  </details>
  <TimetableExport :data="timetableExportData" />
  <WeekTimetable
    :lessons="timetableLessons"
    :week="currentWeek"
    :mode="timetableExportData.mode"
    :day="timetableExportData.day"
    @select="$emit('detail', $event)"
  />
</template>
