<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ProgramModule } from "../domain/models";
import { catalog } from "../api/catalog";
import { programOfferings } from "../domain/programOfferings";
import { useSemester } from "../features/useSemester";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePlanner } from "../features/usePlanner";
import QueryState from "./QueryState.vue";
import ProgramOfferingCourse from "./ProgramOfferingCourse.vue";
import LessonDetailDialog from "./LessonDetailDialog.vue";
import SchemeSelector from "./SchemeSelector.vue";
defineEmits<{ course: [code: string] }>();
const props = defineProps<{ modules: ProgramModule[]; search: string }>(),
  semesters = useSemester(),
  semester = semesters.selected,
  code = useFilter("lesson"),
  planner = usePlanner(semester),
  query = useQuery(
    (signal, force) => catalog.lessons(semester.value, { signal, force }),
    semester,
    () => !!semester.value,
  ),
  rows = computed(() =>
    programOfferings(props.modules, query.data.value ?? []),
  ),
  candidateIds = computed(
    () => new Set(planner.lessons.value.map((l) => l.id)),
  ),
  detail = computed(
    () =>
      query.data.value?.find((l) => l.code === code.value) ??
      planner.lessons.value.find((l) => l.code === code.value),
  );
const openKeys = ref(new Set<string>()),
  searchOverrides = ref(new Map<string, boolean>());
watch(
  () => props.search,
  () => {
    searchOverrides.value = new Map();
  },
);
function isOpen(key: string) {
  return props.search.trim()
    ? (searchOverrides.value.get(key) ?? true)
    : openKeys.value.has(key);
}
function toggle(key: string, open: boolean) {
  if (props.search.trim()) searchOverrides.value.set(key, open);
  else if (open) openKeys.value.add(key);
  else openKeys.value.delete(key);
}
function all(open: boolean) {
  rows.value
    .flatMap((row) => row.entries)
    .forEach((item) => toggle(item.key, open));
}
watch(
  [code, rows],
  () => {
    if (!code.value) return;
    rows.value
      .flatMap((row) => row.entries)
      .filter((item) => item.lessons.some((l) => l.code === code.value))
      .forEach((item) => toggle(item.key, true));
  },
  { immediate: true },
);
</script>
<template>
  <div class="program-offering-controls panel">
    <label for="program-offering-semester">开课学期</label>
    <UiSelect id="program-offering-semester" v-model="semester">
      <option
        v-for="term in semesters.data.value"
        :key="term.id"
        :value="term.id"
      >
        {{ term.name }}
      </option>
    </UiSelect>
    <SchemeSelector :planner="planner" />
    <p v-if="planner.storageError.value" class="notice warning" role="status">
      {{ planner.storageError.value }}
    </p>
  </div>
  <QueryState
    :loading="semesters.loading.value || query.loading.value"
    :error="semesters.error.value || query.error.value"
    @retry="query.error.value ? query.reload() : semesters.reload()"
  />
  <div v-if="rows.length" class="flex-actions offering-expand-controls">
    <UiButton class="text-button" @click="all(true)">全部展开</UiButton
    ><UiButton class="text-button" @click="all(false)">全部收起</UiButton>
  </div>
  <section
    v-for="row in rows"
    :key="JSON.stringify([row.path, row.module.id])"
    class="panel program-offering-module"
  >
    <h2>{{ row.path }}</h2>
    <p v-if="row.module.requirement">{{ row.module.requirement }}</p>
    <p class="muted">
      {{
        row.module.requiredCredits === undefined
          ? ""
          : `要求 ${row.module.requiredCredits} 学分；`
      }}{{
        row.module.requiredCourses === undefined
          ? ""
          : `要求 ${row.module.requiredCourses} 门课程；`
      }}{{
        row.module.requiredSubmodules === undefined
          ? ""
          : `要求 ${row.module.requiredSubmodules} 个子模块；`
      }}{{
        row.module.creditsUpperLimit === undefined
          ? ""
          : `学分上限 ${row.module.creditsUpperLimit}；`
      }}{{
        row.module.courseCountUpperLimit === undefined
          ? ""
          : `课程数上限 ${row.module.courseCountUpperLimit}`
      }}
    </p>
    <div
      v-for="rules in row.module.referenceRequirements"
      :key="rules.publicId"
      class="notice"
    >
      <div>
        <strong>公共模块 {{ rules.name }} #{{ rules.publicId }}</strong>
        <p v-if="rules.requirement">{{ rules.requirement }}</p>
        <p v-if="rules.requiredCredits !== undefined">
          要求学分：{{ rules.requiredCredits }}
        </p>
        <p v-if="rules.requiredCourses !== undefined">
          要求课程数：{{ rules.requiredCourses }}
        </p>
        <p v-if="rules.requiredSubmodules !== undefined">
          要求子模块数：{{ rules.requiredSubmodules }}
        </p>
        <p v-if="rules.creditsUpperLimit !== undefined">
          学分上限：{{ rules.creditsUpperLimit }}
        </p>
        <p v-if="rules.courseCountUpperLimit !== undefined">
          课程数上限：{{ rules.courseCountUpperLimit }}
        </p>
      </div>
    </div>
    <p v-if="row.module.referenceState === 'incomplete'" class="notice warning">
      公共模块未完整读取，相关课程及开课状态未知。
    </p>
    <ProgramOfferingCourse
      v-for="item in row.entries"
      :key="item.key"
      :entry="item.entry"
      :lessons="item.lessons"
      :candidate-ids="candidateIds"
      :semester="semester"
      :open="isOpen(item.key)"
      :resolved="query.resolved.value"
      :error="query.error.value || semesters.error.value"
      :detail-code="code"
      @toggle="toggle(item.key, $event)"
      @course="$emit('course', $event)"
      @detail="code = $event"
      @candidate="planner.toggle"
    />
  </section>
  <LessonDetailDialog
    v-if="code"
    :code="code"
    :semester="semester"
    :detail="detail"
    :list-loading="semesters.loading.value || query.loading.value"
    :list-error="semesters.error.value || query.error.value"
    :list-resolved="query.resolved.value"
    :selected="!!detail && candidateIds.has(detail.id)"
    @close="code = ''"
    @candidate="planner.toggle"
    @retry="query.error.value ? query.reload() : semesters.reload()"
  />
</template>
<style scoped>
.program-offering-controls {
  padding: 16px;
  margin: 16px 0;
}
.program-offering-controls > .ui-select {
  display: inline-block;
  vertical-align: middle;
  width: 220px;
  max-width: 100%;
  margin: 0 12px;
}
.program-offering-module {
  padding: 16px;
  margin: 16px 0;
}
.program-offering-module h2 {
  font-size: 18px;
  overflow-wrap: anywhere;
}
.program-offering-course {
  margin-top: 20px;
}
.program-offering-course h3 {
  font-size: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.program-offering-course .course-name {
  margin: 0;
}
@media (max-width: 480px) {
  .program-offering-controls > .ui-select {
    display: block;
    margin: 8px 0;
    width: 100%;
  }
}
</style>
