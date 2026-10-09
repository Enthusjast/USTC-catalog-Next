<script setup lang="ts">
import { computed } from "vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { comparePrograms } from "../domain/programCompare";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import EmptyState from "../components/EmptyState.vue";
const left = useFilter("left"),
  right = useFilter("right"),
  q = useFilter("q");
const tree = useQuery((signal, force) => catalog.programs({ signal, force }));
const options = computed(() =>
  (tree.data.value ?? []).filter(
    (p) => !q.value || `${p.name} ${p.department} ${p.grade}`.includes(q.value),
  ),
);
const before = useQuery(
  (signal, force) => catalog.program(left.value, { signal, force }),
  left,
  () => !!left.value,
);
const after = useQuery(
  (signal, force) => catalog.program(right.value, { signal, force }),
  right,
  () => !!right.value,
);
const comparison = computed(() =>
  before.data.value && after.data.value
    ? comparePrograms(before.data.value, after.data.value)
    : undefined,
);
</script>
<template>
  <PageHeading
    title="培养计划对比"
    description="选择两个执行计划，按课程编号核对新增、移除与字段变化。课程名称相似不会被自动合并。"
    eyebrow="PROGRAM COMPARISON / 计划对比"
  /><QueryState
    :loading="tree.loading.value"
    :error="tree.error.value"
    :meta="tree.meta.value"
    @retry="tree.reload"
  />
  <div class="panel inline-filters">
    <div class="filter-field">
      <label for="compare-q">缩小计划范围</label
      ><input id="compare-q" v-model="q" placeholder="输入专业、院系或年级" />
    </div>
    <div class="filter-field">
      <label for="compare-left">原计划</label
      ><select id="compare-left" v-model="left">
        <option value="">请选择计划</option>
        <option v-for="p in options" :key="p.id" :value="p.id">
          {{ p.grade }} · {{ p.name }} · {{ p.trainType }}
        </option>
      </select>
    </div>
    <div class="filter-field">
      <label for="compare-right">目标计划</label
      ><select id="compare-right" v-model="right">
        <option value="">请选择计划</option>
        <option v-for="p in options" :key="p.id" :value="p.id">
          {{ p.grade }} · {{ p.name }} · {{ p.trainType }}
        </option>
      </select>
    </div>
  </div>
  <QueryState
    :loading="before.loading.value"
    :error="before.error.value"
    :meta="before.meta.value"
    @retry="before.reload"
  /><QueryState
    :loading="after.loading.value"
    :error="after.error.value"
    :meta="after.meta.value"
    @retry="after.reload"
  /><EmptyState
    v-if="!left || !right"
    title="选择两个计划开始比较"
    message="比较链接会保留两个计划的 ID，方便复制分享。"
  /><template v-if="comparison"
    ><div class="notice">
      计划总要求学分：{{ before.data.value?.requiredCredits ?? "未提供" }} →
      {{
        after.data.value?.requiredCredits ?? "未提供"
      }}。模块要求不作重复加总。
    </div>
    <section
      v-for="section in [
        { title: '新增课程', rows: comparison.added },
        { title: '移除课程', rows: comparison.removed },
      ]"
      :key="section.title"
      class="panel compare-section"
    >
      <h2>
        {{ section.title }} <span class="muted">{{ section.rows.length }}</span>
      </h2>
      <div
        v-for="(row, i) in section.rows"
        :key="`${row.entry.course.code}:${i}`"
        class="compare-row"
      >
        <span class="mono">{{ row.entry.course.code }}</span
        ><strong>{{ row.entry.course.name }}</strong
        ><span class="muted">{{ row.module }}</span>
      </div>
      <p v-if="!section.rows.length" class="muted">没有此类变化。</p>
    </section>
    <section class="panel compare-section">
      <h2>
        课程与模块字段变化
        <span class="muted">{{ comparison.changed.length }}</span>
      </h2>
      <article
        v-for="change in comparison.changed"
        :key="change.code"
        class="compare-row"
      >
        <strong class="mono">{{ change.code }}</strong>
        <div
          v-for="(rows, index) in [change.before, change.after]"
          :key="index"
        >
          <span class="tag">{{ index ? "目标计划" : "原计划" }}</span>
          <p v-for="(row, i) in rows" :key="i">
            {{ row.entry.course.name }} ·
            {{ row.entry.course.credits ?? "未提供" }} 学分 ·
            {{ row.entry.compulsory ? "必修" : "选修 / 未提供" }} ·
            {{ row.entry.terms.join("、") || "学期未提供" }}<br /><span
              class="muted"
              >{{ row.module }} {{ row.entry.remark }}</span
            >
          </p>
        </div>
      </article>
      <p v-if="!comparison.changed.length" class="muted">
        已匹配课程没有字段变化。
      </p>
    </section>
    <section class="panel compare-section">
      <h2>无法按名称路径匹配的模块</h2>
      <p class="muted">模块结构或名称发生变化时，列出双方路径供人工核对。</p>
      <p v-for="path in comparison.unmatchedModules.before" :key="`a${path}`">
        原计划：{{ path }}
      </p>
      <p v-for="path in comparison.unmatchedModules.after" :key="`b${path}`">
        目标计划：{{ path }}
      </p>
      <p
        v-if="
          !comparison.unmatchedModules.before.length &&
          !comparison.unmatchedModules.after.length
        "
      >
        双方模块路径均可匹配。
      </p>
    </section></template
  >
</template>
