<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePagination } from "../features/usePagination";
import { useFilterSummary } from "../features/useFilterSummary";
import { clockMinutes, formatClock } from "../domain/schedule";
import { roomAvailability, usageTypes } from "../domain/roomAvailability";
import { isISODate } from "../domain/dates";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterSummary from "../components/FilterSummary.vue";
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
    display: () =>
      ({
        occupied: "有公开占用",
        inferred: "推算未发现占用",
        unknown: "未知 / 覆盖不足",
      })[state.value as "occupied" | "inferred" | "unknown"],
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
function reset() {
  void router.replace({
    path: "/classrooms",
    query: { date: date.value, from: from.value, to: to.value },
  });
}
</script>
<template>
  <PageHeading
    title="教室公开使用记录"
    description="按日期查看公开占用，结合已知记录分析一个时段。接口未提供教室清单的地点不作空闲判断。"
    eyebrow="CLASSROOMS / 教室使用"
  />
  <div class="notice warning">
    “未发现占用”仅根据当前公开使用记录推算，不代表可预约、可进入或已获批准使用。记录覆盖不完整时，状态标为未知。
  </div>
  <div class="panel inline-filters">
    <div class="filter-field">
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
    <div class="filter-field">
      <label for="room-building">楼宇编号</label
      ><select id="room-building" v-model="building">
        <option value="">全部楼宇</option>
        <option v-for="b in buildings" :key="b">{{ b }}</option>
      </select>
    </div>
    <div class="filter-field">
      <label for="room-q">教室</label
      ><input id="room-q" v-model="room" type="search" placeholder="如：5307" />
    </div>
    <div class="filter-field">
      <label for="room-type">公开使用类型</label
      ><select id="room-type" v-model="type">
        <option value="">全部类型</option>
        <option v-for="(name, key) in usageTypes" :key="key" :value="key">
          {{ name }}
        </option>
      </select>
    </div>
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
      ><input id="room-capacity" v-model="capacity" type="number" min="0" />
    </div>
    <div v-if="campuses.length" class="filter-field">
      <label for="room-campus">校区</label
      ><select id="room-campus" v-model="campus">
        <option value="">全部校区</option>
        <option v-for="c in campuses" :key="c">{{ c }}</option>
      </select>
    </div>
    <button class="text-button" @click="reset">清除筛选</button>
  </div>
  <p v-if="!validDate" class="notice error">请选择有效的查询日期。</p>
  <p v-if="!validTime" class="notice error">
    结束时间应晚于开始时间，时段状态暂时未知。
  </p>
  <QueryState :loading="loading" :meta="meta" :error="error" @retry="reload" />
  <FilterSummary
    :filters="filterSummary.filters.value"
    @remove="filterSummary.remove"
    @clear="reset"
  />
  <p v-if="unlocated" class="notice warning">
    该日期另有
    {{ unlocated }}
    条未提供教室的记录。无法排除它们对未占用时段的影响，相关推算状态标为未知。
  </p>
  <div v-if="data" class="section-heading">
    <h2>
      公开记录涉及的教室
      <span class="muted" style="font-size: 13px"
        >{{ filtered.length }} 间</span
      >
    </h2>
    <span>时段 {{ from }}–{{ to }}</span>
  </div>
  <div class="room-grid">
    <article
      v-for="entry in visible"
      :key="`${entry.building}:${entry.room}`"
      class="panel result-card"
    >
      <div class="card-topline">
        <h2 class="mono">{{ entry.room }}</h2>
        <span
          class="tag"
          :class="
            entry.state === 'occupied'
              ? 'warning'
              : entry.state === 'unknown'
                ? ''
                : 'valid'
          "
          >{{
            {
              occupied: "有公开占用",
              unknown: "未知 / 覆盖不足",
              inferred: "推算未发现占用",
            }[entry.state]
          }}</span
        >
      </div>
      <p>
        楼宇 {{ entry.building ?? "未提供"
        }}{{ entry.capacity !== undefined ? ` · 容量 ${entry.capacity}` : ""
        }}{{ entry.campus ? ` · ${entry.campus}` : "" }}
      </p>
      <ul class="usage-list">
        <li
          v-for="record in entry.records.filter(
            (r) => !type || r.type === type,
          )"
          :key="record.id"
        >
          <span class="mono"
            >{{ formatClock(record.start) }}–{{ formatClock(record.end) }}</span
          ><strong>{{ record.title }}</strong
          ><span class="muted">{{
            usageTypes[record.type] ?? record.type
          }}</span>
        </li>
      </ul>
      <p class="room-note">
        时段状态综合所有公开使用类型；显示类型筛选仅控制记录展示。
      </p>
    </article>
  </div>
  <EmptyState
    v-if="data && !filtered.length"
    :title="data.length ? '没有符合条件的教室记录' : '此日期暂无公开使用记录'"
    message="没有记录不代表空闲；接口未提供完整教室清单或日期覆盖范围。可更换日期或清除筛选。"
    ><button class="button secondary" @click="reset">
      清除筛选
    </button></EmptyState
  ><Pagination
    :total="filtered.length"
    :size="12"
    :page="page"
    @change="change"
  />
</template>
