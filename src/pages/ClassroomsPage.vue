<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { LoaderCircle } from "@lucide/vue";
import { useRouter } from "vue-router";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { useFilterSummary } from "../features/useFilterSummary";
import { formatClock } from "../domain/schedule";
import {
  roomAvailability,
  roomKey,
  groupRoomBuildings,
  usageTypes,
  type RoomSummary,
} from "../domain/roomAvailability";
import { roomDirectory, buildingLabel } from "../domain/roomDirectory";
import {
  classroomDay,
  hasUsageTime,
  usageCategory,
} from "../domain/roomTimeline";
import type { RoomUsage } from "../domain/models";
import { isISODate } from "../domain/dates";
import PageHeading from "../components/PageHeading.vue";
import FilterSummary from "../components/FilterSummary.vue";
import FilterPanel from "../components/FilterPanel.vue";
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
  campus = useFilter("campus");
const filterSummary = useFilterSummary({
  building: { label: "楼宇", model: building },
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
const buildings = computed(() =>
  [
    ...new Set([
      ...roomDirectory.map((r) => r.buildingCode),
      ...(data.value ?? [])
        .map((r) => r.building)
        .filter((b): b is string => !!b),
    ]),
  ].sort((a, b) => a.localeCompare(b, "zh", { numeric: true })),
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
const filtered = computed(() =>
  rooms.value.filter(
    (r) =>
      (!room.value || r.room.includes(room.value)) &&
      (!building.value || r.building === building.value) &&
      (!capacity.value ||
        (r.capacity !== undefined && r.capacity >= Number(capacity.value))) &&
      (!campus.value || r.campus === campus.value),
  ),
);
const buildingGroups = computed(() => groupRoomBuildings(filtered.value));
const floors = computed(() =>
  buildingGroups.value.flatMap((group) => group.floors),
);
const floorElements = new Map<string, HTMLElement>();
const floorJump = ref("");
const activeUsage = shallowRef<UsageSelection>();
function floorRef(key: string, element: unknown) {
  if (element instanceof HTMLElement) floorElements.set(key, element);
  else floorElements.delete(key);
}
function jumpToFloor() {
  const target = floorElements.get(floorJump.value);
  target?.scrollIntoView({ block: "start" });
  target
    ?.querySelector<HTMLElement>(".room-floor-title")
    ?.focus({ preventScroll: true });
}
function showUsage(entry: RoomSummary, record: RoomUsage, anchor: HTMLElement) {
  if (
    activeUsage.value?.record.id === record.id &&
    activeUsage.value.anchor === anchor
  ) {
    activeUsage.value = undefined;
    return;
  }
  activeUsage.value = { room: entry, record, date: date.value, anchor };
}
watch(floors, (value) => {
  if (!value.some((floor) => floor.key === floorJump.value))
    floorJump.value = "";
});
const advancedCount = computed(
    () => [capacity.value, campus.value].filter(Boolean).length,
  ),
  advancedOpen = ref(!!advancedCount.value),
  selectedKey = ref("");
const selectedRoom = computed(() =>
  rooms.value.find((entry) => roomKey(entry) === selectedKey.value),
);
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
watch([date, building, room, type, capacity, campus, loading], () => {
  selectedKey.value = "";
  activeUsage.value = undefined;
});
watch(selectedKey, () => {
  activeUsage.value = undefined;
});
function inQueryRange(record: RoomUsage) {
  return (
    hasUsageTime(record) &&
    record.start < classroomDay.to &&
    record.end > classroomDay.from
  );
}
function reset() {
  void router.replace({
    path: "/classrooms",
    query: { date: date.value },
  });
}
</script>
<template>
  <div class="compact-query-page classroom-page">
    <PageHeading
      title="教室使用情况"
      description=""
      eyebrow="CLASSROOMS / 教室使用"
    />
    <FilterPanel
      layout="inline"
      :active-count="filterSummary.count.value"
      :result-count="data ? filtered.length : undefined"
      result-label="间教室"
    >
      <template #primary>
        <div class="filter-field room-date-field">
          <label for="room-date">查询日期</label
          ><input id="room-date" v-model="date" type="date" />
        </div>
      </template>
      <div class="filter-field">
        <label for="room-building">楼宇编号</label
        ><select id="room-building" v-model="building">
          <option value="">全部楼宇</option>
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
    <div v-if="validDate && floors.length" class="room-floor-controls panel">
      <label for="room-floor-jump">跳转楼层</label>
      <select
        id="room-floor-jump"
        v-model="floorJump"
        class="field-input"
        @change="jumpToFloor"
      >
        <option value="">选择楼栋与楼层</option>
        <option v-for="floor in floors" :key="floor.key" :value="floor.key">
          {{ floor.title }}
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
        class="room-building-section"
      >
        <h3 class="room-building-title">{{ group.title }}</h3>
        <div class="room-floor-board">
          <section
            v-for="floor in group.floors"
            :key="floor.key"
            :ref="(element) => floorRef(floor.key, element)"
            class="room-floor-section"
            :aria-label="floor.title"
          >
            <h4 class="room-floor-title" tabindex="-1">{{ floor.label }}</h4>
            <RoomUsageTimeline
              :rooms="floor.rooms"
              :type="type"
              :label="floor.title"
              @select="selectedKey = roomKey($event)"
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
      :title="`${selectedRoom?.room ?? ''} · 全天公开记录`"
      @close="selectedKey = ''"
    >
      <template v-if="selectedRoom">
        <div class="room-detail-summary">
          <strong>{{ date }}</strong>
          <span class="muted">完整教学日</span>
        </div>
        <p class="muted room-detail-caption">
          {{ buildingLabel(selectedRoom.building)
          }}<span v-if="selectedRoom.capacity !== undefined">
            · 容量 {{ selectedRoom.capacity }}</span
          ><span v-if="selectedRoom.campus"> · {{ selectedRoom.campus }}</span
          >。下列为全天全部类型的记录，包含当前图中隐藏的安排。
        </p>
        <p v-if="!selectedRecords.length" class="notice">暂无记录。</p>
        <div
          v-if="selectedRecords.length"
          class="table-scroll room-record-table"
        >
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
                v-for="record in selectedRecords"
                :key="record.id"
                :class="{ 'is-in-range': inQueryRange(record) }"
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
                      showUsage(
                        selectedRoom,
                        record,
                        $event.currentTarget as HTMLElement,
                      )
                    "
                  >
                    <strong>{{ record.title }}</strong>
                    <span>查看占用详情</span>
                  </button>
                  <span v-if="inQueryRange(record)" class="room-record-match"
                    >与教学日显示范围重叠</span
                  >
                </td>
                <td>
                  <span
                    class="room-usage-type"
                    :class="usageCategory(record.type)"
                    >{{ usageTypes[record.type] ?? record.type }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </DisclosureDialog>
    <RoomUsagePopover
      :selection="activeUsage"
      @close="activeUsage = undefined"
    />
  </div>
</template>
