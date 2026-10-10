<script setup lang="ts">
import type { Schedule } from "../domain/models";
import { weekdays } from "../domain/schedule";
defineProps<{ schedule: Schedule }>();
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
          <span class="lesson-slot-location">{{ slot.location }}</span>
          <span class="lesson-slot-weeks muted"
            >第 {{ ranges(slot.weeks) }} 周</span
          >
        </div>
      </li>
    </ul>
    <span v-if="schedule.unknown" class="tag warning">部分时间无法判断</span>
    <p v-if="!schedule.slots.length || schedule.unknown" class="schedule-text">
      {{ schedule.text || "未提供安排" }}
    </p>
    <details v-else class="schedule-original">
      <summary>原始安排</summary>
      <p class="schedule-text">{{ schedule.text }}</p>
    </details>
  </div>
</template>
