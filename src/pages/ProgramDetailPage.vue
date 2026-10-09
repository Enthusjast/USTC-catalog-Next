<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, ArrowLeftRight, Link } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import type { ProgramModule as Module } from "../domain/models";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import ProgramModule from "../components/ProgramModule.vue";
import CourseDetail from "../components/CourseDetail.vue";
const route = useRoute(),
  expandedParam = useFilter("expanded"),
  code = useFilter("course"),
  copied = ref("");
const id = computed(() => String(route.params.id)),
  { data, meta, loading, error, reload } = useQuery(
    (signal, force) => catalog.program(id.value, { signal, force }),
    id,
  );
const expanded = computed(() =>
  expandedParam.value
    ? expandedParam.value.split(",").filter((v) => v !== "none")
    : (data.value?.modules.map((m) => m.id) ?? []),
);
function toggle(moduleId: string, open: boolean) {
  const next = new Set(expanded.value);
  if (open) next.add(moduleId);
  else next.delete(moduleId);
  expandedParam.value = [...next].join(",") || "none";
}
function all(modules: Module[]): string[] {
  return modules.flatMap((m) => [m.id, ...all(m.children)]);
}
async function share() {
  try {
    await navigator.clipboard.writeText(location.href);
    copied.value = "分享链接已复制";
  } catch {
    copied.value = "请复制浏览器地址栏中的完整链接";
  }
}
</script>
<template>
  <RouterLink to="/programs" class="text-button" style="margin-bottom: 20px"
    ><ArrowLeft :size="16" />返回计划目录</RouterLink
  ><PageHeading
    :title="data?.major ?? '计划详情'"
    :description="
      data
        ? `${data.grade} 级 · ${data.trainType} · ${data.department}`
        : `正在读取计划 #${id}`
    "
    eyebrow="ACADEMIC PROGRAM / 计划详情"
    ><button class="button secondary" @click="share">
      <Link :size="16" />复制分享链接</button
    ><RouterLink
      class="button secondary"
      :to="{ path: '/program-compare', query: { left: id } }"
      ><ArrowLeftRight :size="16" />对比计划</RouterLink
    ></PageHeading
  >
  <p v-if="copied" class="notice" role="status">{{ copied }}</p>
  <QueryState
    :loading="loading"
    :error="error"
    :meta="meta"
    @retry="reload"
  /><template v-if="data"
    ><div class="program-overview panel">
      <div>
        <span class="muted">计划要求学分</span
        ><strong>{{ data.requiredCredits ?? "未提供" }}</strong>
      </div>
      <div>
        <span class="muted">起始学期</span
        ><strong>{{ data.beginSemester ?? "未提供" }}</strong>
      </div>
      <p>下方为计划要求。本机候选清单不代表已修学分或毕业资格。</p>
    </div>
    <div class="section-heading">
      <h2>课程模块</h2>
      <div class="flex-actions">
        <button
          class="text-button"
          @click="expandedParam = all(data.modules).join(',')"
        >
          全部展开</button
        ><button class="text-button" @click="expandedParam = 'none'">
          全部收起
        </button>
      </div>
    </div>
    <div class="panel module-tree">
      <ProgramModule
        v-for="module in data.modules"
        :key="module.id"
        :module="module"
        :expanded="expanded"
        @toggle="toggle"
        @course="code = $event"
      /></div></template
  ><CourseDetail :code="code" @close="code = ''" />
</template>
