<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ClockAlert } from "@lucide/vue";
import type { RoomSummary } from "../domain/roomAvailability";
import { roomKey, usageTypes } from "../domain/roomAvailability";
import { formatClock } from "../domain/schedule";
import {
  hasUsageTime,
  classroomDay,
  layoutRoomUsage,
  usageCategory,
} from "../domain/roomTimeline";
const props = defineProps<{
  rooms: RoomSummary[];
  type: string;
  label: string;
}>();
const emit = defineEmits<{
  select: [room: RoomSummary];
  usage: [
    room: RoomSummary,
    record: RoomSummary["records"][number],
    anchor: HTMLElement,
  ];
}>();
function selectUsage(
  room: RoomSummary,
  record: RoomSummary["records"][number],
  event: MouseEvent,
) {
  emit("usage", room, record, event.currentTarget as HTMLElement);
}
const scroll = ref<HTMLElement>();
const columns = computed(() =>
  props.rooms.map((room) => ({
    room,
    blocks: layoutRoomUsage(
      room.records.filter(
        (record) => !props.type || record.type === props.type,
      ),
      classroomDay.from,
      classroomDay.to,
    ),
    unplotted: room.records.filter(
      (record) =>
        !hasUsageTime(record) ||
        record.end <= classroomDay.from ||
        record.start >= classroomDay.to,
    ).length,
  })),
);
watch(
  () => props.rooms.map((room) => roomKey(room)).join("|"),
  () => {
    if (scroll.value) scroll.value.scrollLeft = 0;
  },
);
</script>
<template>
  <figure
    class="room-timeline panel"
    :style="{ '--room-track-height': `${classroomDay.plotHeight}px` }"
  >
    <div
      ref="scroll"
      class="room-timeline-scroll"
      tabindex="0"
      role="region"
      :aria-label="`${label}，可左右滚动查看教室`"
    >
      <div
        class="room-timeline-grid"
        :style="{
          gridTemplateColumns: `repeat(${rooms.length}, 112px)`,
          width: `${rooms.length * 112}px`,
        }"
      >
        <div
          v-for="column in columns"
          :key="roomKey(column.room)"
          class="room-time-column"
        >
          <div class="room-column-header">
            <button
              type="button"
              class="room-label"
              :aria-label="`查看 ${column.room.room} 全天记录，共 ${column.room.records.length} 条${column.unplotted ? `，其中 ${column.unplotted} 项时刻未知或在教学日显示范围外` : ''}`"
              @click="$emit('select', column.room)"
            >
              <strong class="mono">{{ column.room.room }}</strong>
              <span
                v-if="column.unplotted"
                class="room-unplotted-indicator"
                :title="`${column.unplotted} 项时刻未知或在教学日显示范围外，点击教室查看完整记录`"
                aria-hidden="true"
              >
                <ClockAlert :size="13" />
              </span>
            </button>
          </div>
          <div class="room-time-track">
            <button
              type="button"
              v-for="block in column.blocks"
              :key="block.record.id"
              class="room-usage-block"
              :class="[
                usageCategory(block.record.type),
                {
                  'is-short':
                    (block.height * classroomDay.plotHeight) / 100 < 22,
                  'is-tiny':
                    (block.height * classroomDay.plotHeight) / 100 < 16,
                  'is-narrow': block.width < 50,
                  'is-clipped-start': block.clippedStart,
                  'is-clipped-end': block.clippedEnd,
                },
              ]"
              :style="{
                top: `${block.top}%`,
                height: `${block.height}%`,
                left: `${block.left}%`,
                width: `calc(${block.width}% - 2px)`,
              }"
              aria-haspopup="dialog"
              @click="selectUsage(column.room, block.record, $event)"
              :aria-label="`${column.room.room} · ${block.record.title} · ${formatClock(block.record.start)}–${formatClock(block.record.end)} · ${usageTypes[block.record.type] ?? block.record.type}`"
              :title="`${block.record.title} · ${usageTypes[block.record.type] ?? block.record.type}`"
            >
              <span>{{ block.record.title }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </figure>
</template>
