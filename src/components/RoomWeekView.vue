<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RoomUsage } from "../domain/models";
import type { RoomSummary } from "../domain/roomAvailability";
import { weekDates, addISODate } from "../domain/dates";
import { useRoomWeek } from "../features/useRoomWeek";
import RoomUsageTimeline from "./RoomUsageTimeline.vue";
import RoomRecordList from "./RoomRecordList.vue";
const props = defineProps<{ date: string; entry: RoomSummary; type: string }>();
const emit = defineEmits<{
  usage: [
    room: RoomSummary,
    record: RoomUsage,
    anchor: HTMLElement,
    date: string,
  ];
  navigate: [date: string];
}>();
const query = useRoomWeek(
    () => props.date,
    () => props.entry,
  ),
  dates = computed(() => weekDates(props.date));
const days = computed(() =>
  dates.value.map(
    (date) =>
      query.data.value?.find((day) => day.date === date) ?? {
        date,
        room: { ...props.entry, records: [], state: "unknown" as const },
        status: "loading" as const,
      },
  ),
);
const listDate = ref(props.date);
watch(
  () => props.date,
  (value) => (listDate.value = value),
);
const selected = computed(() =>
  days.value.find((day) => day.date === listDate.value),
);
function usage(room: RoomSummary, record: RoomUsage, anchor: HTMLElement) {
  emit(
    "usage",
    room,
    record,
    anchor,
    anchor.closest<HTMLElement>("[data-date]")?.dataset.date ?? props.date,
  );
}
function recordsUsage(
  room: RoomSummary,
  record: RoomUsage,
  anchor: HTMLElement,
  date: string,
) {
  emit("usage", room, record, anchor, date);
}
</script>
<template>
  <div class="room-week-view">
    <div class="flex-actions">
      <UiButton
        class="text-button"
        @click="$emit('navigate', addISODate(date, -7))"
      >
        上一周</UiButton
      ><strong>{{ dates[0] }}–{{ dates[6] }}</strong
      ><UiButton
        class="text-button"
        @click="$emit('navigate', addISODate(date, 7))"
      >
        下一周</UiButton
      ><VarLoading
        type="circle"
        size="small"
        v-if="query.loading.value"
        aria-label="正在加载教室周记录"
      />
    </div>
    <RoomUsageTimeline
      :rooms="days.map((day) => day.room)"
      :column-labels="dates"
      :type="type"
      label="教室本周占用"
      @usage="usage"
      @select="(_room, day) => (listDate = day ?? date)"
    />
    <div class="flex-actions">
      <label for="room-week-list-date">完整记录</label
      ><UiSelect id="room-week-list-date" v-model="listDate">
        <option v-for="day in dates" :key="day" :value="day">{{ day }}</option>
      </UiSelect>
    </div>
    <RoomRecordList
      v-if="selected"
      :room="selected.room"
      :records="selected.room.records"
      :date="selected.date"
      @usage="recordsUsage"
    />
  </div>
</template>
<style scoped>
.room-week-view > .flex-actions {
  margin-bottom: 12px;
}
.room-week-view :deep(.room-timeline) {
  margin: 12px 0;
}
.room-week-view .ui-select {
  width: auto;
  max-width: 100%;
}
.room-week-view :deep(.room-time-column) {
  width: 112px;
}
</style>
