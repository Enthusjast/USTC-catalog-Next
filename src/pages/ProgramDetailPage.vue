<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, ArrowLeftRight, Link } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import type { ProgramModule as Module } from "../domain/models";
import PageHeading from "../components/PageHeading.vue";
import QueryState from "../components/QueryState.vue";
import ProgramModule from "../components/ProgramModule.vue";
import ProgramTermCourses from "../components/ProgramTermCourses.vue";
import ProgramOfferings from "../components/ProgramOfferings.vue";
import { filterProgramModules } from "../domain/programView";
import { exportProgram } from "../domain/tableExports";
import { printProgram } from "../domain/programPrint";
import CourseDetail from "../components/CourseDetail.vue";
import ProgramSources from "../components/ProgramSources.vue";
const route = useRoute(),
  expandedParam = useFilter("expanded"),
  code = useFilter("course"),
  copied = ref(""),
  q = useFilter("q"),
  view = useFilter("view", "modules");
const id = computed(() => String(route.params.id)),
  { data, meta, loading, error, reload } = useQuery(
    (signal, force) => catalog.expandedProgram(id.value, { signal, force }),
    id,
  );
const filteredModules = computed(() =>
  filterProgramModules(data.value?.modules ?? [], q.value),
);
const searchOverrides = ref(new Map<string, boolean>());
watch(q, () => {
  searchOverrides.value = new Map();
});
const expanded = computed(() =>
  q.value.trim()
    ? all(filteredModules.value).filter(
        (id) => searchOverrides.value.get(id) !== false,
      )
    : expandedParam.value
      ? expandedParam.value.split(",").filter((v) => v !== "none")
      : (data.value?.modules.map((m) => m.id) ?? []),
);
function toggle(moduleId: string, open: boolean) {
  if (q.value.trim()) {
    searchOverrides.value.set(moduleId, open);
    return;
  }
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
  /><ProgramSources v-if="data" :program="data" @refresh="reload" /><template
    v-if="data"
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
    <div class="flex-actions program-view-controls">
      <label for="program-module-q" class="sr-only">查找模块或课程</label
      ><input
        id="program-module-q"
        v-model="q"
        type="search"
        placeholder="查找模块、课程或编号"
      /><button
        class="text-button"
        :aria-pressed="view !== 'terms' && view !== 'offerings'"
        @click="view = 'modules'"
      >
        按模块</button
      ><button
        class="text-button"
        :aria-pressed="view === 'terms'"
        @click="view = 'terms'"
      >
        按建议学期</button
      ><button
        class="text-button"
        :aria-pressed="view === 'offerings'"
        @click="view = 'offerings'"
      >
        本学期开课</button
      ><button
        class="text-button"
        @click="exportProgram(data, filteredModules, view)"
      >
        导出 CSV</button
      ><button
        class="text-button"
        @click="printProgram(data, filteredModules, view)"
      >
        打印 / PDF
      </button>
    </div>
    <div
      v-if="view !== 'terms' && view !== 'offerings'"
      class="section-heading"
    >
      <h2>课程模块</h2>
      <div class="flex-actions">
        <button
          class="text-button"
          @click="
            q.trim()
              ? all(filteredModules).forEach((id) =>
                  searchOverrides.set(id, true),
                )
              : (expandedParam = all(data.modules).join(','))
          "
        >
          全部展开</button
        ><button
          class="text-button"
          @click="
            q.trim()
              ? all(filteredModules).forEach((id) =>
                  searchOverrides.set(id, false),
                )
              : (expandedParam = 'none')
          "
        >
          全部收起
        </button>
      </div>
    </div>
    <div
      v-if="view !== 'terms' && view !== 'offerings'"
      class="panel module-tree"
    >
      <ProgramModule
        v-for="module in filteredModules"
        :key="module.id"
        :module="module"
        :expanded="expanded"
        @toggle="toggle"
        @course="code = $event"
      />
    </div>
    <ProgramTermCourses
      v-else-if="view === 'terms'"
      :modules="filteredModules"
      @course="code = $event"
    />
    <ProgramOfferings
      v-else
      :modules="filteredModules"
      :search="q"
      @course="code = $event"
    />
    <p v-if="q && !filteredModules.length" class="muted">
      没有匹配的模块或课程。
    </p></template
  ><CourseDetail :code="code" @close="code = ''" />
</template>

<style scoped>
.program-view-controls {
  margin: 16px 0;
}
.program-view-controls input {
  width: 260px;
  max-width: 100%;
}
</style>
