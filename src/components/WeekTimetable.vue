<script setup lang="ts">
import { computed } from "vue";
import type { Lesson } from "../domain/models";
import { weekdays } from "../domain/schedule";
const props = defineProps<{ lessons: Lesson[]; week: number }>();
defineEmits<{ select: [code: string] }>();
const maxPeriod = computed(() =>
  Math.max(
    13,
    ...props.lessons.flatMap((l) => l.schedule.slots.flatMap((s) => s.periods)),
  ),
);
function cell(day: number, period: number) {
  return props.lessons.flatMap((lesson) => {
    const slots = lesson.schedule.slots.filter(
      (s) =>
        s.day === day &&
        s.periods.includes(period) &&
        s.weeks.includes(props.week),
    );
    return slots.length
      ? [
          {
            lesson,
            slot: {
              location: [...new Set(slots.map((slot) => slot.location))].join(
                "、",
              ),
            },
          },
        ]
      : [];
  });
}
</script>
<template>
  <div class="table-scroll timetable">
    <table>
      <caption class="sr-only">
        第
        {{
          week
        }}
        周候选教学班课表，按星期和课节显示
      </caption>
      <thead>
        <tr>
          <th>课节</th>
          <th v-for="day in weekdays" :key="day">周{{ day }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="period in maxPeriod" :key="period">
          <th>{{ period }}</th>
          <td
            v-for="(_, index) in weekdays"
            :key="index"
            :class="{ 'overlap-cell': cell(index + 1, period).length > 1 }"
          >
            <button
              v-for="{ lesson, slot } in cell(index + 1, period)"
              :key="`${lesson.id}:${slot.location}`"
              class="timetable-item"
              @click="$emit('select', lesson.code)"
            >
              <strong>{{ lesson.course.name }}</strong
              ><span>{{ slot.location }}</span
              ><span v-if="cell(index + 1, period).length > 1" class="tag error"
                >时间重叠</span
              >
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
