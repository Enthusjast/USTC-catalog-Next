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
  <PageHeading
    title="直接课程替代关系"
    description="按课程编号或名称查找接口公开的直接关系，保留课程组合的原始分组。"
    eyebrow="SUBSTITUTIONS / 课程替代"
    ><a
      class="button secondary"
      href="https://www.teach.ustc.edu.cn/?attachment_id=3310"
      target="_blank"
      rel="noopener noreferrer"
      >官方汇总文件<ArrowUpRight :size="16" /></a
  ></PageHeading>
  <div class="notice">
    只展示 API
    提供的直接关系，不推导传递替代资格。组合中的多门课程不可拆成任意一门可替代的结论。公开信息可能次日更新。
  </div>
  <div class="panel inline-filters">
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
  </div>
  <QueryState :loading="loading" :error="error" :meta="meta" @retry="reload" />
  <div class="section-heading">
    <h2>
      直接关系
      <span class="muted" style="font-size: 13px">{{
        data ? `${filtered.length} 组` : ""
      }}</span>
    </h2>
  </div>
  <div class="result-list">
    <article
      v-for="relation in visible"
      :key="relation.id"
      class="panel substitution-card"
    >
      <div class="substitution-group">
        <span class="filter-label muted"
          >替代课程{{ relation.substitutes.length > 1 ? "组合" : "" }}</span
        ><RouterLink
          v-for="course in relation.substitutes"
          :key="course.code"
          :to="{
            path: '/courses',
            query: { q: course.code, course: course.code, history: '1' },
          }"
          ><span class="mono">{{ course.code }}</span
          ><strong>{{ course.name }}</strong
          ><span v-if="course.credits !== undefined" class="muted"
            >{{ course.credits }} 学分</span
          ></RouterLink
        >
      </div>
      <div class="substitution-arrow">
        <ArrowRight :size="22" /><span>直接替代</span>
      </div>
      <div class="substitution-group">
        <span class="filter-label muted"
          >原课程{{ relation.originals.length > 1 ? "组合" : "" }}</span
        ><RouterLink
          v-for="course in relation.originals"
          :key="course.code"
          :to="{
            path: '/courses',
            query: { q: course.code, course: course.code, history: '1' },
          }"
          ><span class="mono">{{ course.code }}</span
          ><strong>{{ course.name }}</strong
          ><span v-if="course.credits !== undefined" class="muted"
            >{{ course.credits }} 学分</span
          ></RouterLink
        >
      </div>
      <p v-if="relation.remark" class="substitution-remark">
        {{ relation.remark }}
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
  ><Pagination
    :total="filtered.length"
    :page="page"
    :size="20"
    @change="change"
  />
</template>
