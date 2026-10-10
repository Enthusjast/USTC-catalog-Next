<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowLeftRight } from "@lucide/vue";
import type { RoomSummary } from "../domain/roomAvailability";
import { roomStateLabels, usageTypes } from "../domain/roomAvailability";
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
}>();
defineEmits<{ select: [room: RoomSummary] }>();
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
  () => props.rooms.map((room) => `${room.building}:${room.room}`).join("|"),
  () => {
    if (scroll.value) scroll.value.scrollLeft = 0;
  },
);
</script>
<template>
  <figure class="room-timeline panel">
    <figcaption class="room-timeline-caption">
      <div class="room-usage-legend" aria-label="记录类型图例">
        <span><i class="usage-swatch teaching" />教学安排</span>
        <span><i class="usage-swatch occupation" />公开占用</span>
        <span><i class="usage-swatch exam" />考试</span>
      </div>
      <span class="muted room-caption-full"
        >状态综合全部类型；点击教室编号查看全天记录。</span
      >
      <span class="muted room-caption-short">点编号看记录</span>
      <span v-if="type" class="room-type-caption"
        >图中仅展示：{{ usageTypes[type] ?? type }}；状态仍综合全部类型。</span
      >
    </figcaption>
    <div
      ref="scroll"
      class="room-timeline-scroll"
      tabindex="0"
      role="region"
      aria-label="教室占用时间轴，可左右滚动查看教室"
    >
      <div
        class="room-timeline-grid"
        :style="{
          gridTemplateColumns: `48px repeat(${rooms.length}, minmax(84px, 1fr))`,
          minWidth: `${48 + rooms.length * 84}px`,
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
          :key="`${column.room.building}:${column.room.room}`"
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
              <span>楼宇 {{ column.room.building ?? "未提供" }}</span>
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
          <div class="room-time-track" aria-hidden="true">
            <div
              v-for="tick in ticks"
              :key="tick.time"
              class="room-gridline"
              :style="{ top: `${tick.position}%` }"
            />
            <div
              v-for="block in column.blocks"
              :key="block.record.id"
              class="room-usage-block"
              :class="[
                usageCategory(block.record.type),
                {
                  'is-short': block.height < (22 / 360) * 100,
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
              :title="`${formatClock(block.record.start)}–${formatClock(block.record.end)} · ${block.record.title} · ${usageTypes[block.record.type] ?? block.record.type}`"
            >
              <span>{{ block.record.title }}</span>
            </div>
            <p v-if="!column.blocks.length" class="room-track-empty">
              {{
                type && column.room.state === "occupied"
                  ? "占用来自其他类型"
                  : "此时段暂无可定位记录"
              }}
            </p>
          </div>
          <div class="room-column-footer">
            <span>全天 {{ column.room.records.length }} 条</span>
            <span v-if="column.unknown" class="room-unknown-count"
              >{{ column.unknown }} 条时刻未知</span
            >
          </div>
        </div>
      </div>
    </div>
    <p class="room-timeline-hint">
      <ArrowLeftRight
        :size="14"
      />窄屏可左右滑动；完整记录包含未标时及查询时段以外的安排。
    </p>
  </figure>
</template>
