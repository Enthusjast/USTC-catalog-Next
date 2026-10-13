<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import type { Lesson } from "../domain/models";
import {
  timetableBlocks,
  timetableClusters,
  courseHue,
  type TimetableCluster,
} from "../domain/timetable";
import { weekdays } from "../domain/schedule";
import DisclosureDialog from "./DisclosureDialog.vue";
import Pagination from "./Pagination.vue";
const props = withDefaults(
  defineProps<{
    lessons: Lesson[];
    week: number;
    mode?: "week" | "day";
    day?: number;
  }>(),
  { mode: "week", day: 1 },
);
const emit = defineEmits<{ select: [code: string] }>();
const days = computed(() =>
  props.mode === "day" ? [props.day] : [1, 2, 3, 4, 5, 6, 7],
);
const blocks = computed(() =>
  timetableBlocks(props.lessons, props.week).filter((b) =>
    days.value.includes(b.day),
  ),
);
const clusters = computed(() => timetableClusters(blocks.value));
const unknown = computed(() =>
  props.lessons.filter((l) => l.schedule.unknown || !l.schedule.slots.length),
);
const selected = shallowRef<TimetableCluster>(),
  page = ref(1);
const denseVisible = computed(
  () =>
    selected.value?.blocks.slice((page.value - 1) * 50, page.value * 50) ?? [],
);
watch(
  () => [props.week, props.day, props.mode, props.lessons],
  () => {
    selected.value = undefined;
    page.value = 1;
  },
);
function choose(cluster: TimetableCluster) {
  selected.value = cluster;
  page.value = 1;
}
function select(code: string) {
  selected.value = undefined;
  emit("select", code);
}
function position(
  day: number,
  start: number,
  end: number,
  lane = 0,
  lanes = 1,
) {
  return {
    gridColumn: String(days.value.indexOf(day) + 2),
    gridRow: `${start + 1} / ${end + 1}`,
    marginLeft: `${(lane / lanes) * 100}%`,
    width: `calc(${100 / lanes}% - 4px)`,
  };
}
</script>
<template>
  <div
    class="table-scroll merged-timetable"
    :class="{ 'is-day': mode === 'day' }"
  >
    <div
      class="timetable-grid"
      :style="{ '--days': days.length }"
      role="group"
      :aria-label="`第 ${week} 周${mode === 'day' ? '单日' : '完整周'}课表`"
    >
      <div class="tt-corner">课节</div>
      <div
        v-for="(d, i) in days"
        :key="d"
        class="tt-day"
        :style="{ gridColumn: i + 2, gridRow: 1 }"
      >
        周{{ weekdays[d - 1] }}
      </div>
      <div
        v-for="period in 14"
        :key="period"
        class="tt-period"
        :style="{ gridColumn: 1, gridRow: period + 1 }"
      >
        {{ period }}
      </div>
      <template v-for="cluster in clusters" :key="cluster.key">
        <button
          v-ripple
          v-if="cluster.lanes > 3"
          class="tt-block tt-dense"
          :style="position(cluster.day, cluster.start, cluster.end)"
          :aria-label="`周${weekdays[cluster.day - 1]}，第 ${cluster.start}–${cluster.end - 1} 节，${cluster.blocks.length} 项安排，展开全部`"
          @click="choose(cluster)"
        >
          <strong>{{ cluster.blocks.length }} 项安排</strong
          ><span>展开全部</span>
        </button>
        <button
          v-ripple
          v-for="block in cluster.lanes <= 3 ? cluster.blocks : []"
          :key="block.key"
          class="tt-block"
          :style="{
            ...position(
              block.day,
              block.start,
              block.end,
              block.lane,
              cluster.lanes,
            ),
            '--course-hue': courseHue(block.lesson.course.code),
          }"
          :title="`${block.lesson.course.name} · ${block.lesson.teachers.join('、')} · ${block.location}`"
          :aria-label="`${block.lesson.course.name}，${block.lesson.code}，周${weekdays[block.day - 1]}第 ${block.start}–${block.end - 1} 节，${block.lesson.teachers.join('、')}，${block.location}`"
          @click="$emit('select', block.lesson.code)"
        >
          <strong>{{ block.lesson.course.name }}</strong
          ><span>{{ block.lesson.teachers.join("、") }}</span
          ><span>{{ block.location }}</span
          ><span v-if="cluster.lanes > 1" class="sr-only"
            >同一时段有其他教学班</span
          >
        </button>
      </template>
    </div>
  </div>
  <p v-if="lessons.length && !blocks.length" class="muted">
    当前教学周没有可定位安排。
  </p>
  <details v-if="unknown.length" class="unknown-schedules">
    <summary>无法完整定位的安排 {{ unknown.length }}</summary>
    <div v-for="lesson in unknown" :key="lesson.id">
      <UiButton class="course-name" @click="$emit('select', lesson.code)">
        {{ lesson.course.name }} · {{ lesson.code }}
      </UiButton>
      <p>{{ lesson.schedule.text || "未提供安排" }}</p>
    </div>
  </details>
  <DisclosureDialog
    :open="!!selected"
    title="同一时段的全部安排"
    @close="selected = undefined"
    ><div
      v-for="block in denseVisible"
      :key="block.key"
      class="dense-schedule-row"
    >
      <UiButton class="course-name" @click="select(block.lesson.code)">
        {{ block.lesson.course.name }} · {{ block.lesson.code }}
      </UiButton>
      <p>
        周{{ weekdays[block.day - 1] }} 第 {{ block.start }}–{{
          block.end - 1
        }}
        节 · {{ block.lesson.teachers.join("、") }} · {{ block.location }}
      </p>
    </div>
    <Pagination
      :total="selected?.blocks.length ?? 0"
      :size="50"
      :page="page"
      @change="page = $event"
  /></DisclosureDialog>
</template>
<style scoped>
.merged-timetable {
  margin: 16px 0;
}
.timetable-grid {
  display: grid;
  grid-template-columns: 44px repeat(var(--days), minmax(104px, 1fr));
  grid-template-rows: 40px repeat(14, 52px);
  min-width: 780px;
  position: relative;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 51px,
    var(--border) 51px,
    var(--border) 52px
  );
  background-position: 0 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.is-day .timetable-grid {
  min-width: 0;
  grid-template-columns: 44px minmax(180px, 1fr);
}
.tt-day,
.tt-corner {
  background: var(--surface-soft);
  text-align: center;
  font-size: 13px;
  padding: 9px 4px;
}
.tt-period {
  background: var(--surface);
  font-size: 12px;
  padding: 14px 4px;
  text-align: center;
  position: sticky;
  left: 0;
  z-index: 2;
  border-right: 1px solid var(--border);
}
.tt-block {
  align-self: stretch;
  justify-self: start;
  margin: 2px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid hsl(var(--course-hue) 45% 70%);
  border-radius: 5px;
  text-align: left;
  padding: 4px;
  background: hsl(var(--course-hue) 65% 94%);
  color: hsl(var(--course-hue) 50% 25%);
  font-size: 11px;
  line-height: 15px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.tt-block strong {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.tt-block span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-dense {
  background: var(--surface-soft);
  color: var(--text);
  border-color: var(--border);
  justify-content: center;
  min-height: 44px;
}
.unknown-schedules {
  margin: 16px 0;
}
.unknown-schedules > div,
.dense-schedule-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.unknown-schedules p,
.dense-schedule-row p {
  overflow-wrap: anywhere;
  font-size: 13px;
}
[data-theme="dark"] .tt-block:not(.tt-dense) {
  background: hsl(var(--course-hue) 30% 22%);
  color: hsl(var(--course-hue) 55% 86%);
  border-color: hsl(var(--course-hue) 25% 45%);
}
</style>
