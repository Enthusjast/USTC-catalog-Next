<script lang="ts">
import type { RoomUsage } from "../domain/models";
import type { RoomSummary } from "../domain/roomAvailability";
export interface UsageSelection {
  room: RoomSummary;
  record: RoomUsage;
  date: string;
  anchor: HTMLElement;
}
</script>
<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  watch,
  type CSSProperties,
} from "vue";
import { X } from "@lucide/vue";
import { buildingLabel } from "../domain/roomDirectory";
import { usageTypes } from "../domain/roomAvailability";
import { formatClock } from "../domain/schedule";
import { hasUsageTime, usageCategory } from "../domain/roomTimeline";
const props = defineProps<{ selection?: UsageSelection }>();
const emit = defineEmits<{ close: [] }>();
const card = ref<HTMLElement>(),
  titleId = useId();
const position = shallowRef<CSSProperties>({ visibility: "hidden" });
const host = computed(
  () => props.selection?.anchor.closest("dialog") ?? document.body,
);
const duration = computed(() => {
  const record = props.selection?.record;
  if (!record || !hasUsageTime(record)) return undefined;
  const minutes = record.end - record.start;
  return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} 小时 ` : ""}${minutes % 60 ? `${minutes % 60} 分钟` : ""}`.trim();
});
function close(restore = false) {
  const anchor = props.selection?.anchor;
  emit("close");
  if (restore && anchor?.isConnected) anchor.focus({ preventScroll: true });
}
function outside(event: PointerEvent) {
  const selection = props.selection;
  const target = event.target;
  if (
    !selection ||
    !(target instanceof Node) ||
    card.value?.contains(target) ||
    selection.anchor.contains(target)
  )
    return;
  close();
}
function escape(event: KeyboardEvent) {
  if (!props.selection || event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  close(true);
}
function scrollOrResize(event: Event) {
  if (!props.selection) return;
  if (event.target instanceof Node && card.value?.contains(event.target))
    return;
  close();
}
watch(
  () => props.selection,
  async (selection) => {
    if (!selection) return;
    position.value = { visibility: "hidden" };
    await nextTick();
    if (props.selection !== selection || !card.value) return;
    if (!selection.anchor.isConnected) {
      close();
      return;
    }
    const viewport = window.visualViewport;
    const offsetLeft = viewport?.offsetLeft ?? 0,
      offsetTop = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? document.documentElement.clientWidth;
    const height = viewport?.height ?? window.innerHeight;
    const dialog = selection.anchor.closest("dialog");
    const bounds = dialog?.getBoundingClientRect();
    const leftBound = Math.max(offsetLeft, bounds?.left ?? offsetLeft) + 12;
    const rightBound =
      Math.min(offsetLeft + width, bounds?.right ?? offsetLeft + width) - 12;
    const topBound = Math.max(offsetTop, bounds?.top ?? offsetTop) + 12;
    const bottomBound =
      Math.min(offsetTop + height, bounds?.bottom ?? offsetTop + height) - 12;
    const cardWidth = Math.min(360, Math.max(0, rightBound - leftBound));
    const maxHeight = Math.min(420, Math.max(0, bottomBound - topBound));
    position.value = {
      width: `${cardWidth}px`,
      maxHeight: `${maxHeight}px`,
      visibility: "hidden",
    };
    await nextTick();
    if (props.selection !== selection || !card.value) return;
    const rect = selection.anchor.getBoundingClientRect();
    const cardHeight = card.value.getBoundingClientRect().height;
    const preferredTop =
      rect.bottom + 8 + cardHeight <= bottomBound
        ? rect.bottom + 8
        : rect.top - cardHeight - 8;
    position.value = {
      width: `${cardWidth}px`,
      maxHeight: `${maxHeight}px`,
      left: `${Math.max(leftBound, Math.min(rect.left, rightBound - cardWidth))}px`,
      top: `${Math.max(topBound, Math.min(preferredTop, bottomBound - cardHeight))}px`,
    };
    await nextTick();
    if (props.selection !== selection) return;
    card.value
      .querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
  },
  { flush: "post" },
);
onMounted(() => {
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("keydown", escape, true);
  window.addEventListener("scroll", scrollOrResize, true);
  window.addEventListener("resize", scrollOrResize);
  window.visualViewport?.addEventListener("resize", scrollOrResize);
  window.visualViewport?.addEventListener("scroll", scrollOrResize);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", outside, true);
  document.removeEventListener("keydown", escape, true);
  window.removeEventListener("scroll", scrollOrResize, true);
  window.removeEventListener("resize", scrollOrResize);
  window.visualViewport?.removeEventListener("resize", scrollOrResize);
  window.visualViewport?.removeEventListener("scroll", scrollOrResize);
});
</script>
<template>
  <Teleport v-if="selection" :to="host">
    <section
      ref="card"
      class="room-usage-popover panel"
      :style="position"
      role="dialog"
      :aria-labelledby="titleId"
    >
      <header class="room-usage-popover-header">
        <h3 :id="titleId">占用详情</h3>
        <button
          type="button"
          class="icon-button"
          aria-label="关闭占用详情"
          @click="close(true)"
        >
          <X :size="18" />
        </button>
      </header>
      <div class="room-usage-popover-body">
        <h4 class="usage-detail-title">{{ selection.record.title }}</h4>
        <span
          class="room-usage-type"
          :class="usageCategory(selection.record.type)"
          >{{
            usageTypes[selection.record.type] ?? selection.record.type
          }}</span
        >
        <dl class="usage-detail-fields">
          <div>
            <dt>日期</dt>
            <dd>{{ selection.date }}</dd>
          </div>
          <div>
            <dt>实际时刻</dt>
            <dd class="mono">
              {{ formatClock(selection.record.start) }}–{{
                formatClock(selection.record.end)
              }}
            </dd>
          </div>
          <div v-if="duration">
            <dt>时长</dt>
            <dd>{{ duration }}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>
              {{ buildingLabel(selection.room.building) }} ·
              {{
                selection.room.floor === undefined
                  ? "楼层未确认"
                  : `${selection.room.floor} 层`
              }}
              · {{ selection.room.room }}
            </dd>
          </div>
          <div v-if="selection.record.teachers?.length">
            <dt>教师</dt>
            <dd>{{ selection.record.teachers.join("、") }}</dd>
          </div>
          <div v-if="selection.record.courseId">
            <dt>课程标识</dt>
            <dd class="mono">{{ selection.record.courseId }}</dd>
          </div>
          <div v-if="selection.record.applierName">
            <dt>申请人</dt>
            <dd>{{ selection.record.applierName }}</dd>
          </div>
          <div v-if="selection.record.sponsorName">
            <dt>组织方</dt>
            <dd>{{ selection.record.sponsorName }}</dd>
          </div>
        </dl>
        <p v-if="!hasUsageTime(selection.record)" class="usage-time-warning">
          时刻缺失或无效，无法完整定位占用。
        </p>
      </div>
    </section>
  </Teleport>
</template>
