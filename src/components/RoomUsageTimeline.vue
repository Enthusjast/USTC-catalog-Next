<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RoomSummary } from "../domain/roomAvailability";
import {
  roomKey,
  roomStateLabels,
  usageTypes,
} from "../domain/roomAvailability";
import { formatClock } from "../domain/schedule";
import {
  hasUsageTime,
  layoutRoomUsage,
  roomTimelineTicks,
  usageCategory,
} from "../domain/roomTimeline";
const props = defineProps<{
  rooms: RoomSummary[];
  from: number;
  to: number;
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
const ticks = computed(() => roomTimelineTicks(props.from, props.to));
const columns = computed(() =>
  props.rooms.map((room) => ({
    room,
    blocks: layoutRoomUsage(
      room.records.filter(
        (record) => !props.type || record.type === props.type,
      ),
      props.from,
      props.to,
    ),
    unknown: room.records.filter((record) => !hasUsageTime(record)).length,
  })),
);
const shortState = {
  occupied: "有公开占用",
  inferred: "推算未发现",
  unknown: "未知",
};
watch(
  () => props.rooms.map((room) => roomKey(room)).join("|"),
  () => {
    if (scroll.value) scroll.value.scrollLeft = 0;
  },
);
</script>
<template>
  <figure class="room-timeline panel">
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
          gridTemplateColumns: `48px repeat(${rooms.length}, 112px)`,
          width: `${48 + rooms.length * 112}px`,
        }"
      >
        <div class="room-time-axis" aria-hidden="true">
          <div class="room-column-header room-axis-heading">时刻</div>
          <div class="room-axis-track">
            <span
              v-for="tick in ticks"
              :key="tick.time"
              class="room-axis-tick mono"
              :class="{
                'is-start': tick.position === 0,
                'is-end': tick.position === 100,
              }"
              :style="{ top: `${tick.position}%` }"
              >{{ formatClock(tick.time) }}</span
            >
          </div>
          <div class="room-column-footer" />
        </div>
        <div
          v-for="column in columns"
          :key="roomKey(column.room)"
          class="room-time-column"
        >
          <div class="room-column-header">
            <button
              type="button"
              class="room-label"
              :aria-label="`查看 ${column.room.room} 全天记录，共 ${column.room.records.length} 条，${roomStateLabels[column.room.state]}`"
              @click="$emit('select', column.room)"
            >
              <strong class="mono">{{ column.room.room }}</strong>
            </button>
            <span
              class="tag room-state"
              :class="{
                warning: column.room.state === 'occupied',
                valid: column.room.state === 'inferred',
              }"
              :title="roomStateLabels[column.room.state]"
              :aria-label="roomStateLabels[column.room.state]"
              >{{ shortState[column.room.state] }}</span
            >
          </div>
          <div class="room-time-track">
            <div
              v-for="tick in ticks"
              :key="tick.time"
              class="room-gridline"
              aria-hidden="true"
              :style="{ top: `${tick.position}%` }"
            />
            <button
              type="button"
              v-for="block in column.blocks"
              :key="block.record.id"
              class="room-usage-block"
              :class="[
                usageCategory(block.record.type),
                {
                  'is-short': block.height < (22 / 240) * 100,
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
              :title="`${formatClock(block.record.start)}–${formatClock(block.record.end)} · ${block.record.title} · ${usageTypes[block.record.type] ?? block.record.type}`"
            >
              <span>{{ block.record.title }}</span>
            </button>
            <p v-if="!column.blocks.length" class="room-track-empty">
              {{
                type && column.room.state === "occupied"
                  ? "占用来自其他类型"
                  : "此时段暂无可定位记录"
              }}
            </p>
          </div>
          <div class="room-column-footer">
            <button
              type="button"
              class="room-records-button"
              :aria-label="`查看 ${column.room.room} 全天 ${column.room.records.length} 项占用清单`"
              @click="$emit('select', column.room)"
            >
              全天 {{ column.room.records.length }} 项
            </button>
            <span v-if="column.unknown" class="room-unknown-count"
              >{{ column.unknown }} 项时刻未知</span
            >
          </div>
        </div>
      </div>
    </div>
  </figure>
</template>
