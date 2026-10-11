<script setup lang="ts">
import type { RoomUsage } from "../domain/models";
import type { RoomSummary } from "../domain/roomAvailability";
import { usageTypes } from "../domain/roomAvailability";
import { formatClock } from "../domain/schedule";
import {
  hasUsageTime,
  classroomDay,
  usageCategory,
} from "../domain/roomTimeline";
defineProps<{ room: RoomSummary; records: RoomUsage[]; date: string }>();
defineEmits<{
  usage: [
    room: RoomSummary,
    record: RoomUsage,
    anchor: HTMLElement,
    date: string,
  ];
}>();
function inRange(record: RoomUsage) {
  return (
    hasUsageTime(record) &&
    record.start < classroomDay.to &&
    record.end > classroomDay.from
  );
}
</script>
<template>
  <div v-if="records.length" class="table-scroll room-record-table">
    <table>
      <thead>
        <tr>
          <th>时间安排</th>
          <th>公开记录</th>
          <th>使用类型</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in records"
          :key="record.id"
          :class="{ 'is-in-range': inRange(record) }"
        >
          <td>
            <span class="mono"
              >{{ formatClock(record.start) }}–{{
                formatClock(record.end)
              }}</span
            ><span v-if="!hasUsageTime(record)" class="tag warning">{{
              record.start !== undefined && record.end !== undefined
                ? "起止时刻无效"
                : "时刻未知"
            }}</span>
          </td>
          <td>
            <button
              type="button"
              class="room-record-detail-button"
              aria-haspopup="dialog"
              @click="
                $emit(
                  'usage',
                  room,
                  record,
                  $event.currentTarget as HTMLElement,
                  date,
                )
              "
            >
              <strong>{{ record.title }}</strong
              ><span>查看占用详情</span>
            </button>
          </td>
          <td>
            <span class="room-usage-type" :class="usageCategory(record.type)">{{
              usageTypes[record.type] ?? record.type
            }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.room-record-detail-button strong {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 3.2em;
  overflow: hidden;
  overflow-wrap: anywhere;
}
</style>
