<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, ArrowUpRight } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePagination } from "../features/usePagination";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import SubstitutionGroup from "../components/SubstitutionGroup.vue";
const q = useFilter("q"),
  side = useFilter("side", "both");
const { data, meta, loading, error, reload } = useQuery((signal, force) =>
  catalog.substitutions({ signal, force }),
);
const filtered = computed(() =>
  (data.value ?? []).filter((s) => {
    const courses =
      side.value === "substitute"
        ? s.substitutes
        : side.value === "original"
          ? s.originals
          : [...s.substitutes, ...s.originals];
    return courses.some((c) =>
      `${c.code} ${c.name} ${c.englishName ?? ""}`
        .toLowerCase()
        .includes(q.value.toLowerCase()),
    );
  }),
);
const { page, visible, change } = usePagination(filtered, 20);
</script>
<template>
  <div class="compact-query-page substitutions-page">
    <PageHeading
      title="课程替代关系"
      description="按课程编号或名称查找直接关系，整体核对课程组合。"
      eyebrow="SUBSTITUTIONS / 课程替代"
    >
      <a
        class="text-button official-substitutions"
        aria-label="查看官方课程替代关系汇总文件"
        href="https://www.teach.ustc.edu.cn/?attachment_id=3310"
        target="_blank"
        rel="noopener noreferrer"
        ><span class="official-label-full">官方汇总文件</span
        ><span class="official-label-short">官方汇总</span
        ><ArrowUpRight :size="15"
      /></a>
    </PageHeading>
    <div class="notice">
      公开信息可能次日更新。多门组合须整体核对；只展示直接关系，不推导传递替代资格。
    </div>
    <div class="panel inline-filters substitution-filters">
      <div class="filter-field">
        <label for="sub-q">课程名称或编号</label
        ><input
          id="sub-q"
          v-model="q"
          type="search"
          placeholder="替代方或原课程"
        />
      </div>
      <div class="filter-field">
        <label for="sub-side">匹配关系哪一方</label
        ><select id="sub-side" v-model="side">
          <option value="both">关系双方</option>
          <option value="substitute">替代课程</option>
          <option value="original">原课程</option>
        </select>
      </div>
      <button
        type="button"
        class="text-button"
        :disabled="!q && side === 'both'"
        @click="
          q = '';
          side = 'both';
        "
      >
        清除筛选
      </button>
    </div>
    <QueryState
      :loading="loading"
      :error="error"
      :meta="meta"
      @retry="reload"
    />
    <div class="section-heading compact-results-heading">
      <h2>
        直接关系
        <span class="muted result-total" aria-live="polite">{{
          data ? `${filtered.length} 组` : "—"
        }}</span>
      </h2>
      <span class="muted">替代课程 → 原课程</span>
    </div>
    <div class="substitution-results">
      <article
        v-for="relation in visible"
        :key="relation.id"
        class="panel substitution-card"
      >
        <SubstitutionGroup :courses="relation.substitutes" label="替代课程" />
        <div class="substitution-arrow" role="img" aria-label="直接替代">
          <ArrowRight :size="18" /><span>直接</span>
        </div>
        <SubstitutionGroup :courses="relation.originals" label="原课程" />
        <p v-if="relation.remark" class="substitution-remark">
          <span>备注：</span>{{ relation.remark }}
        </p>
      </article>
    </div>
    <EmptyState
      v-if="data && !filtered.length"
      message="尝试课程编号、名称或改为匹配关系双方。"
      ><button
        class="button secondary"
        @click="
          q = '';
          side = 'both';
        "
      >
        清除筛选
      </button></EmptyState
    >
    <Pagination
      :total="filtered.length"
      :page="page"
      :size="20"
      @change="change"
    />
  </div>
</template>
