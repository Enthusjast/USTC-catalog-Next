<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowUpRight, ArrowRight } from "@lucide/vue";
import { archives } from "../api/archives";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePagination } from "../features/usePagination";
import { useFilterSummary } from "../features/useFilterSummary";
import PageHeading from "../components/PageHeading.vue";
import FilterPanel from "../components/FilterPanel.vue";
import FilterSummary from "../components/FilterSummary.vue";
import ProgramCollectionTabs from "../components/ProgramCollectionTabs.vue";
import QueryState from "../components/QueryState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
const router = useRouter(),
  q = useFilter("q"),
  type = useFilter("type"),
  department = useFilter("department");
const filterSummary = useFilterSummary({
  q: { label: "关键词", model: q },
  type: { label: "资料类型", model: type },
  department: { label: "院系", model: department },
});
const { data, meta, loading, error, reload } = useQuery((signal, force) =>
  archives.index({ signal, force }),
);
const types = computed(() => [
  ...new Set(data.value?.documents.map((document) => document.kind)),
]);
const departments = computed(() => [
  ...new Set(
    (data.value?.documents ?? [])
      .map((document) => document.department)
      .filter((name): name is string => !!name),
  ),
]);
const filtered = computed(() =>
  (data.value?.documents ?? []).filter(
    (document) =>
      (!q.value ||
        `${document.title} ${document.code} ${document.department ?? ""}`.includes(
          q.value,
        )) &&
      (!type.value || document.kind === type.value) &&
      (!department.value || document.department === department.value),
  ),
);
const { page, visible, change } = usePagination(filtered, 12);
function reset() {
  void router.replace({ path: "/archives", query: {} });
}
</script>
<template>
  <PageHeading title="历史培养方案归档"
    ><a
      class="button secondary"
      href="https://www.teach.ustc.edu.cn/education/241.html"
      target="_blank"
      rel="noopener noreferrer"
      >官方历史归档<ArrowUpRight :size="16" /></a
  ></PageHeading>
  <ProgramCollectionTabs current="archives" />
  <QueryState :loading="loading" :error="error" :meta="meta" @retry="reload" />
  <div class="query-layout">
    <FilterPanel
      :active-count="filterSummary.count.value"
      :result-count="data ? filtered.length : undefined"
      result-label="份资料"
      ><div class="filter-field">
        <label for="archive-q">文档名称或编号</label
        ><input
          id="archive-q"
          v-model="q"
          type="search"
          placeholder="如：数学、001001"
        />
      </div>
      <div class="filter-field">
        <label for="archive-type">资料类型</label
        ><select id="archive-type" v-model="type">
          <option value="">全部类型</option>
          <option v-for="value in types" :key="value">{{ value }}</option>
        </select>
      </div>
      <div class="filter-field">
        <label for="archive-department">院系（来源有标注时）</label
        ><select id="archive-department" v-model="department">
          <option value="">全部院系</option>
          <option v-for="value in departments" :key="value">{{ value }}</option>
        </select>
      </div>
      <button class="text-button" @click="reset">清除筛选</button></FilterPanel
    >
    <div>
      <FilterSummary
        :filters="filterSummary.filters.value"
        @remove="filterSummary.remove"
        @clear="reset"
      />
      <div v-if="data" class="section-heading">
        <h2>
          2013 级静态目录
          <span class="muted" style="font-size: 13px"
            >{{ filtered.length }} 份</span
          >
        </h2>
      </div>
      <div class="archive-grid">
        <article
          v-for="document in visible"
          :key="document.code"
          class="panel result-card"
        >
          <div class="card-topline">
            <span class="tag warning">{{ document.version }} · 静态资料</span
            ><span class="mono muted">{{ document.code }}</span>
          </div>
          <h2>
            <RouterLink :to="`/archives/${document.code}`">{{
              document.title
            }}</RouterLink>
          </h2>
          <p>
            {{ document.kind
            }}{{ document.department ? ` · ${document.department}` : "" }}
          </p>
          <RouterLink
            class="button secondary"
            style="margin-top: 20px"
            :to="`/archives/${document.code}`"
            >浏览正文与课程表<ArrowRight :size="16"
          /></RouterLink>
        </article>
      </div>
      <EmptyState
        v-if="data && !filtered.length"
        message="尝试专业名称、方案编号，或清除类型与院系筛选。"
        ><button class="button secondary" @click="reset">
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
  <section v-if="data" class="panel archive-attachments">
    <div class="section-heading">
      <h2>历年官方附件</h2>
      <a
        :href="data.historySource"
        class="text-button"
        target="_blank"
        rel="noopener noreferrer"
        >官方归档来源<ArrowUpRight :size="14"
      /></a>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>版本</th>
            <th>资料</th>
            <th>格式与来源</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="attachment in data.attachments" :key="attachment.id">
            <td>
              <span class="tag">{{ attachment.version }}</span>
            </td>
            <td>
              <a
                :href="attachment.source"
                target="_blank"
                rel="noopener noreferrer"
                class="course-name"
                >{{ attachment.title }}<ArrowUpRight :size="14"
              /></a>
            </td>
            <td>{{ attachment.kind }} · 本科教育官方归档</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
