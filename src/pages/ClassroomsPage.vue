<script setup lang="ts">
import {
  computed,
  ref,
  shallowRef,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { LoaderCircle, ChevronLeft, ChevronRight } from "@lucide/vue";
import { useRouter } from "vue-router";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { useFilterSummary } from "../features/useFilterSummary";
import {
  roomAvailability,
  roomKey,
  groupRoomBuildings,
  usageTypes,
  type RoomSummary,
} from "../domain/roomAvailability";
import {
  roomDirectory,
  buildingLabel,
  roomBuildingCode,
} from "../domain/roomDirectory";
import { classroomDay, hasUsageTime } from "../domain/roomTimeline";
import type { RoomUsage } from "../domain/models";
import { isISODate, addISODate } from "../domain/dates";
import PageHeading from "../components/PageHeading.vue";
import FilterSummary from "../components/FilterSummary.vue";
import FilterPanel from "../components/FilterPanel.vue";
import RoomRecordList from "../components/RoomRecordList.vue";
import RoomWeekView from "../components/RoomWeekView.vue";
import { useClassroomPositions } from "../features/useClassroomPositions";
import RoomUsageTimeline from "../components/RoomUsageTimeline.vue";
import DisclosureDialog from "../components/DisclosureDialog.vue";
import EmptyState from "../components/EmptyState.vue";
import RoomUsagePopover, {
  type UsageSelection,
} from "../components/RoomUsagePopover.vue";
const router = useRouter(),
  today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
  date = useFilter("date", today),
  building = useFilter("building"),
  room = useFilter("room"),
  type = useFilter("type"),
  capacity = useFilter("capacity"),
  campus = useFilter("campus"),
  selectedKey = useFilter("roomKey"),
  roomView = useFilter("roomView", "day");
const filterSummary = useFilterSummary({
  building: {
    label: "楼宇",
    model: building,
    display: () => buildingLabel(building.value),
  },
  room: { label: "教室", model: room },
  type: {
    label: "使用类型",
    model: type,
    display: () => usageTypes[type.value],
  },
  capacity: { label: "容量至少", model: capacity },
  campus: { label: "校区", model: campus },
});
const validDate = computed(() => isISODate(date.value));
const { data, loading } = useQuery(
  (signal, force) => catalog.rooms(date.value, { signal, force }),
  date,
  validDate,
);
const campuses = computed(() => [
  ...new Set(
    (data.value ?? []).map((r) => r.campus).filter((c): c is string => !!c),
  ),
]);
const hasCapacity = computed(() =>
  data.value?.some((r) => r.capacity !== undefined),
);
const rooms = computed(() =>
  roomAvailability(
    data.value ?? [],
    classroomDay.from,
    classroomDay.to,
    roomDirectory,
  ),
);
const buildings = computed(() =>
  [
    ...new Set(
      rooms.value.map(roomBuildingCode).filter((b): b is string => !!b),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh", { numeric: true })),
);
const filtered = computed(() =>
  rooms.value.filter(
    (r) =>
      (!room.value || r.room.includes(room.value)) &&
      (!building.value ||
        r.building === building.value ||
        roomBuildingCode(r) === building.value) &&
      (!capacity.value ||
        (r.capacity !== undefined && r.capacity >= Number(capacity.value))) &&
      (!campus.value || r.campus === campus.value),
  ),
);
const buildingGroups = computed(() => groupRoomBuildings(filtered.value));
const buildingElements = new Map<string, HTMLElement>();
const buildingJump = ref("");
const activeUsage = shallowRef<UsageSelection>();
function buildingRef(key: string, element: unknown) {
  if (element instanceof HTMLElement) buildingElements.set(key, element);
  else buildingElements.delete(key);
}
function jumpToBuilding() {
  activeUsage.value = undefined;
  const target = buildingElements.get(buildingJump.value);
  target?.scrollIntoView({ block: "start" });
  target
    ?.querySelector<HTMLElement>(".room-building-title")
    ?.focus({ preventScroll: true });
}
function showUsage(
  entry: RoomSummary,
  record: RoomUsage,
  anchor: HTMLElement,
  usageDate = date.value,
) {
  if (
    activeUsage.value?.record.id === record.id &&
    activeUsage.value.anchor === anchor
  ) {
    activeUsage.value = undefined;
    return;
  }
  activeUsage.value = { room: entry, record, date: usageDate, anchor };
}
watch(buildingGroups, (value) => {
  if (!value.some((group) => group.key === buildingJump.value))
    buildingJump.value = "";
});
const advancedCount = computed(
    () => [capacity.value, campus.value].filter(Boolean).length,
  ),
  advancedOpen = ref(!!advancedCount.value);
const selectedSnapshot = shallowRef<RoomSummary>();
function openRoom(entry: RoomSummary) {
  selectedSnapshot.value = entry;
  roomView.value = "day";
  selectedKey.value = roomKey(entry);
}
const selectedRoom = computed(
  () =>
    rooms.value.find((entry) => roomKey(entry) === selectedKey.value) ??
    (selectedSnapshot.value &&
    roomKey(selectedSnapshot.value) === selectedKey.value
      ? selectedSnapshot.value
      : undefined),
);
watch(selectedRoom, (entry) => {
  if (entry) selectedSnapshot.value = entry;
});
const selectedRecords = computed(() =>
  [...(selectedRoom.value?.records ?? [])].sort(
    (a, b) =>
      Number(!hasUsageTime(a)) - Number(!hasUsageTime(b)) ||
      (a.start ?? Infinity) - (b.start ?? Infinity) ||
      a.id.localeCompare(b.id),
  ),
);
watch(advancedCount, (count) => {
  if (count) advancedOpen.value = true;
});
watch([building, room, type, capacity, campus], () => {
  selectedKey.value = "";
  activeUsage.value = undefined;
});
watch(date, () => {
  if (roomView.value !== "week") selectedKey.value = "";
  activeUsage.value = undefined;
});
watch(loading, () => {
  activeUsage.value = undefined;
});
watch(selectedKey, () => {
  activeUsage.value = undefined;
});
function reset() {
  void router.replace({
    path: "/classrooms",
    query: { date: date.value },
  });
}
const pageElement = ref<HTMLElement>(),
  dateControls = ref<HTMLElement>();
const navigationStyle = ref<Record<string, string>>({});
let resize: ResizeObserver | undefined;
onMounted(() => {
  const header = document.querySelector<HTMLElement>(".site-header");
  const measure = () => {
    navigationStyle.value = {
      "--room-header-height": `${header?.offsetHeight ?? 64}px`,
      "--room-date-height": `${dateControls.value?.offsetHeight ?? 44}px`,
    };
  };
  resize = new ResizeObserver(measure);
  watch(
    dateControls,
    (element) => {
      if (element) resize!.observe(element);
      measure();
    },
    { flush: "post" },
  );
  [header, dateControls.value].forEach((el) => {
    if (el) resize!.observe(el);
  });
  measure();
});
onBeforeUnmount(() => resize?.disconnect());
useClassroomPositions(
  () =>
    JSON.stringify([
      date.value,
      building.value,
      room.value,
      type.value,
      capacity.value,
      campus.value,
    ]),
  () => !loading.value && validDate.value,
  pageElement,
);
</script>
<template>
  <div
    ref="pageElement"
    class="compact-query-page classroom-page"
    :style="navigationStyle"
  >
    <PageHeading
      title="教室使用情况"
      description=""
      eyebrow="CLASSROOMS / 教室使用"
    />
    <div ref="dateControls" class="room-date-controls panel">
      <label for="room-date" class="sr-only">查询日期</label
      ><input id="room-date" v-model="date" type="date" />
      <div class="flex-actions">
        <button
          class="icon-button"
          :disabled="!validDate"
          aria-label="前一天"
          @click="date = addISODate(date, -1)"
        >
          <ChevronLeft :size="18" /></button
        ><button class="text-button" @click="date = today">今天</button
        ><button
          class="icon-button"
          :disabled="!validDate"
          aria-label="后一天"
          @click="date = addISODate(date, 1)"
        >
          <ChevronRight :size="18" />
        </button>
      </div>
    </div>
    <FilterPanel
      layout="inline"
      :active-count="filterSummary.count.value"
      :result-count="data ? filtered.length : undefined"
      result-label="间教室"
    >
      <div class="filter-field">
        <label for="room-building">楼宇编号</label
        ><select id="room-building" v-model="building">
          <option value="">全部楼宇</option>
          <option v-if="building === '3'" value="3">第三教学楼（全部）</option>
          <option v-for="b in buildings" :key="b" :value="b">
            {{ buildingLabel(b) }}
          </option>
        </select>
      </div>
      <div class="filter-field">
        <label for="room-q">教室</label
        ><input
          id="room-q"
          v-model="room"
          type="search"
          placeholder="如：5307"
        />
      </div>
      <div class="filter-field">
        <label for="room-type">显示记录类型</label
        ><select id="room-type" v-model="type">
          <option value="">全部类型</option>
          <option v-for="(name, key) in usageTypes" :key="key" :value="key">
            {{ name }}
          </option>
        </select>
      </div>
      <details
        v-if="hasCapacity || campuses.length"
        class="room-more-filters"
        :open="advancedOpen"
        @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary>
          更多条件<span v-if="advancedCount" class="filter-count">{{
            advancedCount
          }}</span>
        </summary>
        <div class="room-advanced-fields">
          <div v-if="hasCapacity" class="filter-field">
            <label for="room-capacity">最低容量</label
            ><input
              id="room-capacity"
              v-model="capacity"
              type="number"
              inputmode="numeric"
              min="0"
            />
          </div>
          <div v-if="campuses.length" class="filter-field">
            <label for="room-campus">校区</label
            ><select id="room-campus" v-model="campus">
              <option value="">全部校区</option>
              <option v-for="c in campuses" :key="c">{{ c }}</option>
            </select>
          </div>
        </div>
      </details>
      <button type="button" class="text-button" @click="reset">清除筛选</button>
    </FilterPanel>
    <div
      v-if="loading"
      class="room-query-loading"
      role="status"
      aria-label="正在加载教室使用情况"
    >
      <LoaderCircle class="spin" :size="18" aria-hidden="true" />
    </div>
    <FilterSummary
      :filters="filterSummary.filters.value"
      @remove="filterSummary.remove"
      @clear="reset"
    />
    <div
      v-if="validDate && buildingGroups.length"
      class="room-building-controls panel"
    >
      <label for="room-building-jump">跳转楼栋</label>
      <select
        id="room-building-jump"
        v-model="buildingJump"
        class="field-input"
        @change="jumpToBuilding"
      >
        <option value="">选择楼栋</option>
        <option
          v-for="group in buildingGroups"
          :key="group.key"
          :value="group.key"
        >
          {{ group.title }}
        </option>
      </select>
      <div class="room-usage-legend" aria-label="记录类型图例">
        <span><i class="usage-swatch teaching" />上课使用</span
        ><span><i class="usage-swatch occupation" />临时借用</span
        ><span><i class="usage-swatch exam" />考试使用</span>
      </div>
    </div>
    <div v-if="validDate" class="room-building-board">
      <section
        v-for="group in buildingGroups"
        :key="group.key"
        :ref="(element) => buildingRef(group.key, element)"
        class="room-building-section"
      >
        <h3 class="room-building-title" tabindex="-1">{{ group.title }}</h3>
        <div class="room-floor-board">
          <section
            v-for="floor in group.floors"
            :key="floor.key"
            :data-floor-key="floor.key"
            class="room-floor-section"
            :aria-label="floor.title"
          >
            <h4 class="room-floor-title" tabindex="-1">{{ floor.label }}</h4>
            <RoomUsageTimeline
              :rooms="floor.rooms"
              :type="type"
              :label="floor.title"
              @select="openRoom"
              @usage="showUsage"
            />
          </section>
        </div>
      </section>
    </div>
    <EmptyState
      v-if="validDate && data && !filtered.length"
      title="没有符合条件的教室"
      message="请调整楼宇或教室筛选。"
    >
      <button class="button secondary" @click="reset">清除筛选</button>
    </EmptyState>
    <DisclosureDialog
      :open="!!selectedRoom"
      :title="`${selectedRoom?.room ?? ''} · ${roomView === 'week' ? '本周' : '全天'}公开记录`"
      @close="selectedKey = ''"
    >
      <template v-if="selectedRoom"
        ><div class="flex-actions">
          <button
            class="text-button"
            :aria-pressed="roomView !== 'week'"
            @click="roomView = 'day'"
          >
            单日记录</button
          ><button
            class="text-button"
            :aria-pressed="roomView === 'week'"
            @click="roomView = 'week'"
          >
            本周使用
          </button>
        </div>
        <RoomWeekView
          v-if="roomView === 'week'"
          :date="date"
          :entry="selectedRoom"
          :type="type"
          @navigate="date = $event"
          @usage="showUsage"
        /><template v-else>
          <div class="room-detail-summary">
            <strong>{{ date }}</strong>
            <span class="muted">完整教学日</span>
          </div>
          <p class="muted room-detail-caption">
            {{ buildingLabel(roomBuildingCode(selectedRoom))
            }}<span v-if="selectedRoom.capacity !== undefined">
              · 容量 {{ selectedRoom.capacity }}</span
            ><span v-if="selectedRoom.campus"> · {{ selectedRoom.campus }}</span
            >。下列为全天全部类型的记录，包含当前图中隐藏的安排。
          </p>
          <p v-if="!selectedRecords.length" class="notice">暂无记录。</p>
          <RoomRecordList
            :room="selectedRoom"
            :records="selectedRecords"
            :date="date"
            @usage="showUsage"
          />
        </template>
      </template>
    </DisclosureDialog>
    <RoomUsagePopover
      :selection="activeUsage"
      @close="activeUsage = undefined"
    />
  </div>
</template>

<style scoped>
.room-date-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  position: sticky;
  top: calc(var(--room-header-height, 64px) + 8px);
  z-index: 5;
  margin-bottom: 12px;
}
.room-date-controls input {
  width: 170px;
  min-height: 44px;
  max-width: 100%;
}
.room-date-controls .flex-actions {
  gap: 8px;
}
.room-building-section {
  scroll-margin-top: calc(
    var(--room-header-height, 64px) + var(--room-date-height, 60px) + 24px
  );
}
</style>
