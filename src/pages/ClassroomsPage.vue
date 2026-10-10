<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronDown } from "@lucide/vue";
import { useRouter } from "vue-router";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePagination } from "../features/usePagination";
import { useFilterSummary } from "../features/useFilterSummary";
import { clockMinutes, formatClock } from "../domain/schedule";
import {
  roomAvailability,
  roomStateLabels,
  usageTypes,
  type RoomSummary,
} from "../domain/roomAvailability";
import { hasUsageTime, usageCategory } from "../domain/roomTimeline";
import type { RoomUsage } from "../domain/models";
import { isISODate } from "../domain/dates";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterSummary from "../components/FilterSummary.vue";
import FilterPanel from "../components/FilterPanel.vue";
import RoomUsageTimeline from "../components/RoomUsageTimeline.vue";
import DisclosureDialog from "../components/DisclosureDialog.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
const router = useRouter(),
  today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
  date = useFilter("date", today),
  from = useFilter("from", "08:00"),
  to = useFilter("to", "18:00"),
  building = useFilter("building"),
  room = useFilter("room"),
  type = useFilter("type"),
  state = useFilter("state"),
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
  state: {
    label: "时段状态",
    model: state,
    display: () => roomStateLabels[state.value as keyof typeof roomStateLabels],
  },
  capacity: { label: "容量至少", model: capacity },
  campus: { label: "校区", model: campus },
});
const validDate = computed(() => isISODate(date.value));
const { data, meta, loading, error, reload } = useQuery(
  (signal, force) => catalog.rooms(date.value, { signal, force }),
  date,
  validDate,
);
const buildings = computed(() =>
  [
    ...new Set(
      (data.value ?? []).map((r) => r.building).filter((b): b is string => !!b),
    ),
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
const validTime = computed(
  () =>
    clockMinutes(from.value) !== undefined &&
    clockMinutes(to.value) !== undefined &&
    clockMinutes(to.value)! > clockMinutes(from.value)!,
);
const rooms = computed(() =>
  roomAvailability(
    data.value ?? [],
    clockMinutes(from.value),
    clockMinutes(to.value),
  ),
);
const filtered = computed(() =>
  rooms.value.filter(
    (r) =>
      (!room.value || r.room.includes(room.value)) &&
      (!building.value || r.building === building.value) &&
      (!type.value || r.records.some((record) => record.type === type.value)) &&
      (!state.value || r.state === state.value) &&
      (!capacity.value ||
        (r.capacity !== undefined && r.capacity >= Number(capacity.value))) &&
      (!campus.value || r.campus === campus.value),
  ),
);
const { page, visible, change } = usePagination(filtered, 12);
const unlocated = computed(
  () => data.value?.filter((r) => !r.room).length ?? 0,
);
const advancedCount = computed(
    () => [state.value, capacity.value, campus.value].filter(Boolean).length,
  ),
  advancedOpen = ref(!!advancedCount.value),
  selectedKey = ref("");
const roomKey = (entry: RoomSummary) =>
  JSON.stringify([entry.building, entry.room]);
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
watch(
  [
    date,
    from,
    to,
    building,
    room,
    type,
    state,
    capacity,
    campus,
    page,
    loading,
  ],
  () => {
    selectedKey.value = "";
  },
);
function inQueryRange(record: RoomUsage) {
  return (
    validTime.value &&
    hasUsageTime(record) &&
    record.start < clockMinutes(to.value)! &&
    record.end > clockMinutes(from.value)!
  );
}
function reset() {
  void router.replace({
    path: "/classrooms",
    query: { date: date.value, from: from.value, to: to.value },
  });
}
</script>
<template>
  <div class="compact-query-page classroom-page">
    <PageHeading
      title="教室使用情况"
      description="按日期与时段查看教室的公开使用分布。"
      eyebrow="CLASSROOMS / 教室使用"
    />
    <details class="notice warning room-coverage-note">
      <summary>
        <span>未发现占用 ≠ 可使用</span
        ><span v-if="unlocated" class="coverage-count"
          >{{ unlocated }} 条缺少地点</span
        ><ChevronDown :size="14" />
      </summary>
      <p>
        仅展示公开记录涉及的教室；推算未发现占用不代表空闲、可预约或获准使用。
        <span v-if="unlocated"
          >另有
          {{ unlocated }} 条未提供教室的记录，未占用时段的覆盖仍可能不足。</span
        >
      </p>
    </details>
    <FilterPanel
      layout="inline"
      :active-count="filterSummary.count.value"
      :result-count="data && validTime ? filtered.length : undefined"
      result-label="间教室"
    >
      <template #primary>
        <div class="filter-field room-date-field">
          <label for="room-date">查询日期</label
          ><input id="room-date" v-model="date" type="date" />
        </div>
        <div class="filter-field">
          <label for="room-from">开始时间</label
          ><input id="room-from" v-model="from" type="time" />
        </div>
        <div class="filter-field">
          <label for="room-to">结束时间</label
          ><input id="room-to" v-model="to" type="time" />
        </div>
      </template>
      <div class="filter-field">
        <label for="room-building">楼宇编号</label
        ><select id="room-building" v-model="building">
          <option value="">全部楼宇</option>
          <option v-for="b in buildings" :key="b">{{ b }}</option>
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
          <div class="filter-field">
            <label for="room-state">时段状态</label
            ><select id="room-state" v-model="state">
              <option value="">全部状态</option>
              <option value="occupied">有公开占用</option>
              <option value="inferred">推算未发现占用</option>
              <option value="unknown">未知 / 覆盖不足</option>
            </select>
          </div>
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
    <p v-if="!validDate" class="notice error" role="alert">
      请选择有效的查询日期。
    </p>
    <p v-if="!validTime" class="notice error" role="alert">
      结束时间应晚于开始时间，请修正时段后查看时间轴。
    </p>
    <QueryState
      :loading="loading"
      :meta="meta"
      :error="error"
      @retry="reload"
    />
    <FilterSummary
      :filters="filterSummary.filters.value"
      @remove="filterSummary.remove"
      @clear="reset"
    />
    <div
      v-if="data && validTime"
      class="section-heading compact-results-heading"
    >
      <h2>
        公开记录涉及的教室
        <span class="muted result-total" aria-live="polite"
          >{{ filtered.length }} 间</span
        >
      </h2>
      <span class="muted">{{ date }} · {{ from }}–{{ to }}</span>
    </div>
    <RoomUsageTimeline
      v-if="validDate && validTime && visible.length"
      :rooms="visible"
      :from="clockMinutes(from)!"
      :to="clockMinutes(to)!"
      :type="type"
      @select="selectedKey = roomKey($event)"
    />
    <EmptyState
      v-if="data && validTime && !filtered.length"
      :title="data.length ? '没有符合条件的教室记录' : '此日期暂无公开使用记录'"
      message="没有记录不代表空闲；公开记录未提供完整教室清单或日期覆盖范围。可更换日期或清除筛选。"
    >
      <button class="button secondary" @click="reset">清除筛选</button>
    </EmptyState>
    <Pagination
      v-if="validDate && validTime"
      :total="filtered.length"
      :size="12"
      :page="page"
      @change="change"
    />
    <DisclosureDialog
      :open="!!selectedRoom"
      :title="`${selectedRoom?.room ?? ''} · 全天公开记录`"
      @close="selectedKey = ''"
    >
      <template v-if="selectedRoom">
        <div class="room-detail-summary">
          <strong>{{ date }}</strong>
          <span
            class="tag"
            :class="{
              warning: selectedRoom.state === 'occupied',
              valid: selectedRoom.state === 'inferred',
            }"
            >{{ roomStateLabels[selectedRoom.state] }}</span
          >
          <span class="muted">查询时段 {{ from }}–{{ to }}</span>
        </div>
        <p class="muted room-detail-caption">
          楼宇 {{ selectedRoom.building ?? "未提供"
          }}<span v-if="selectedRoom.capacity !== undefined">
            · 容量 {{ selectedRoom.capacity }}</span
          ><span v-if="selectedRoom.campus"> · {{ selectedRoom.campus }}</span
          >。下列为全天全部类型的记录，包含当前图中隐藏的安排。
        </p>
        <div class="table-scroll room-record-table">
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
                  <strong>{{ record.title }}</strong
                  ><span v-if="inQueryRange(record)" class="room-record-match"
                    >与查询时段重叠</span
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
        <p class="muted room-detail-caption">
          时段状态综合全部公开类型；时刻无法识别或记录覆盖不足时，未发现占用的时段仍为未知。
        </p>
      </template>
    </DisclosureDialog>
  </div>
</template>
