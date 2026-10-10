<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, ArrowLeftRight } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePagination } from "../features/usePagination";
import { useFilterSummary } from "../features/useFilterSummary";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
import ProgramCollectionTabs from "../components/ProgramCollectionTabs.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
const router = useRouter(),
  q = useFilter("q"),
  dept = useFilter("dept"),
  type = useFilter("type"),
  grade = useFilter("grade");
const filterSummary = useFilterSummary({
  q: { label: "关键词", model: q },
  type: { label: "培养类型", model: type },
  dept: { label: "院系", model: dept },
  grade: {
    label: "入学年级",
    model: grade,
    display: () => `${grade.value} 级`,
  },
});
const { data, meta, loading, error, reload } = useQuery((signal, force) =>
  catalog.programs({ signal, force }),
);
const departments = computed(() => [
  ...new Set(data.value?.map((p) => p.department)),
]);
const types = computed(() => [...new Set(data.value?.map((p) => p.trainType))]);
const grades = computed(() =>
  [...new Set(data.value?.map((p) => p.grade))].sort().reverse(),
);
const filtered = computed(() =>
  (data.value ?? []).filter(
    (p) =>
      (!q.value ||
        `${p.name} ${p.major} ${p.department}`
          .toLowerCase()
          .includes(q.value.toLowerCase())) &&
      (!dept.value || p.department === dept.value) &&
      (!type.value || p.trainType === type.value) &&
      (!grade.value || p.grade === grade.value),
  ),
);
const { page, visible, change } = usePagination(filtered, 12);
function clear() {
  void router.replace({ path: "/programs", query: {} });
}
</script>
<template>
  <PageHeading title="培养方案与执行计划"
    ><RouterLink class="button secondary" to="/program-compare"
      ><ArrowLeftRight :size="16" />计划对比</RouterLink
    ></PageHeading
  >
  <ProgramCollectionTabs current="plans" />
  <div class="query-layout">
    <FilterPanel
      :active-count="filterSummary.count.value"
      :result-count="data ? filtered.length : undefined"
      result-label="个计划"
      ><div class="filter-field">
        <label for="program-q">专业或计划名称</label
        ><input
          id="program-q"
          v-model="q"
          type="search"
          placeholder="如：数学、强基"
        />
      </div>
      <div class="filter-field">
        <label for="program-type">培养类型</label
        ><select id="program-type" v-model="type">
          <option value="">全部培养类型</option>
          <option v-for="t in types" :key="t">{{ t }}</option>
        </select>
      </div>
      <div class="filter-field">
        <label for="program-dept">院系</label
        ><select id="program-dept" v-model="dept">
          <option value="">全部院系</option>
          <option v-for="d in departments" :key="d">{{ d }}</option>
        </select>
      </div>
      <div class="filter-field">
        <label for="program-grade">入学年级</label
        ><select id="program-grade" v-model="grade">
          <option value="">全部年级</option>
          <option v-for="g in grades" :key="g">{{ g }}</option>
        </select>
      </div>
      <button class="text-button" @click="clear">
        清除全部筛选
      </button></FilterPanel
    >
    <div>
      <QueryState
        :loading="loading"
        :meta="meta"
        :error="error"
        @retry="reload"
      />
      <FilterSummary
        :filters="filterSummary.filters.value"
        @remove="filterSummary.remove"
        @clear="clear"
      />
      <div class="section-heading">
        <h2>
          计划目录
          <span class="muted" style="font-size: 13px">{{
            data ? `${filtered.length} 个计划` : ""
          }}</span>
        </h2>
        <span>按入学年级降序</span>
      </div>
      <div class="result-list program-results">
        <article
          v-for="program in visible"
          :key="program.id"
          class="result-card panel"
        >
          <div class="card-topline">
            <span class="tag"
              >{{ program.grade }} 级 · {{ program.trainType }}</span
            ><span class="mono muted" style="font-size: 11px"
              >#{{ program.id }}</span
            >
          </div>
          <h2>
            <RouterLink :to="`/programs/${program.id}`">{{
              program.name
            }}</RouterLink>
          </h2>
          <p>{{ program.department }} / {{ program.major }}</p>
          <div class="card-bottom">
            <RouterLink
              class="text-button"
              :to="{ path: '/program-compare', query: { left: program.id } }"
              >加入对比</RouterLink
            ><RouterLink
              class="button small secondary"
              :to="`/programs/${program.id}`"
              >展开计划<ArrowRight :size="15"
            /></RouterLink>
          </div>
        </article>
      </div>
      <EmptyState v-if="data && !filtered.length"
        ><button class="button secondary" @click="clear">
          清除筛选
        </button></EmptyState
      ><Pagination
        :total="filtered.length"
        :size="12"
        :page="page"
        @change="change"
      />
    </div>
  </div>
</template>
