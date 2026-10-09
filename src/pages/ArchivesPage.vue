<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowUpRight, Archive, ArrowRight } from "@lucide/vue";
import { archives } from "../api/archives";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePagination } from "../features/usePagination";
import PageHeading from "../components/PageHeading.vue";
import FilterPanel from "../components/FilterPanel.vue";
import QueryState from "../components/QueryState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
const router = useRouter(),
  q = useFilter("q"),
  type = useFilter("type"),
  department = useFilter("department");
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
  <PageHeading
    title="历史培养方案归档"
    description="浏览 2013 级静态方案的正文与课程表，查阅历年官方 PDF 附件。历史资料的版本不代表当前安排。"
    eyebrow="ARCHIVES / 历史资料"
    ><a
      class="button secondary"
      href="https://www.teach.ustc.edu.cn/education/241.html"
      target="_blank"
      rel="noopener noreferrer"
      >官方历史归档<ArrowUpRight :size="16" /></a
  ></PageHeading>
  <nav class="tabs" aria-label="资料集合">
    <RouterLink to="/programs">API 执行计划</RouterLink
    ><RouterLink class="active" to="/archives"
      >历史培养方案 / 静态归档</RouterLink
    >
  </nav>
  <div class="notice">
    <Archive :size="19" />
    <p>
      本页资料依据原站明确标注的 2013
      级目录归档。课程表保留原表的列、合并单元格与备注；完整正文从官方静态文档阅读区打开。归档采集时间不代表资料更新时间。
    </p>
  </div>
  <QueryState :loading="loading" :error="error" :meta="meta" @retry="reload" />
  <div class="query-layout">
    <FilterPanel
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
    <p class="muted">
      版本标识来自官方归档表；链接指向原始 PDF 或官方专业设置页。
    </p>
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
