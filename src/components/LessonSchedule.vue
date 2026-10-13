<script setup lang="ts">
import type { Schedule } from "../domain/models";
import { weekdays } from "../domain/schedule";
import { roomLink } from "../domain/queryLinks";
import { addISODate, isISODate } from "../domain/dates";
const props = defineProps<{
  schedule: Schedule;
  date?: string;
  weekStart?: string;
  week?: number;
}>();
function slotDate(weeks: number[], day: number) {
  return props.weekStart &&
    isISODate(props.weekStart) &&
    props.week &&
    weeks.includes(props.week)
    ? addISODate(props.weekStart, day - 1)
    : props.date;
}
function ranges(values: number[]) {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const result: string[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const start = sorted[index]!;
    let end = start;
    while (sorted[index + 1] === end + 1) end = sorted[++index]!;
    result.push(start === end ? String(start) : `${start}–${end}`);
  }
  return result.join("、");
}
</script>
<template>
  <div class="lesson-schedule">
    <ul v-if="schedule.slots.length" class="lesson-arrangements">
      <li v-for="(slot, index) in schedule.slots" :key="index">
        <div class="lesson-slot-time">
          <strong>周{{ weekdays[slot.day - 1] }}</strong>
          <span>第 {{ ranges(slot.periods) }} 节</span>
          <RouterLink
            v-if="roomLink(slot.location, slotDate(slot.weeks, slot.day))"
            class="lesson-slot-location text-button"
            :to="roomLink(slot.location, slotDate(slot.weeks, slot.day))!"
            >{{ slot.location }}</RouterLink
          ><span v-else class="lesson-slot-location">{{ slot.location }}</span>
          <span class="lesson-slot-weeks muted"
            >第 {{ ranges(slot.weeks) }} 周</span
          >
        </div>
      </li>
    </ul>
    <VarChip
      size="small"
      :elevation="false"
      v-if="schedule.unknown"
      class="tag warning"
      >部分时间无法判断</VarChip
    >
    <p v-if="!schedule.slots.length || schedule.unknown" class="schedule-text">
      {{ schedule.text || "未提供安排" }}
    </p>
    <details v-else class="schedule-original">
      <summary>原始安排</summary>
      <p class="schedule-text">{{ schedule.text }}</p>
    </details>
  </div>
</template>
