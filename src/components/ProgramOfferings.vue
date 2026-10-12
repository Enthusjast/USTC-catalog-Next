<script setup lang="ts">
import { computed } from "vue";
import type { ProgramModule } from "../domain/models";
import { catalog } from "../api/catalog";
import { programOfferings } from "../domain/programOfferings";
import { useSemester } from "../features/useSemester";
import { useQuery } from "../features/useQuery";
import { useFilter } from "../features/useFilters";
import { usePlanner } from "../features/usePlanner";
import QueryState from "./QueryState.vue";
import LessonList from "./LessonList.vue";
import LessonDetailDialog from "./LessonDetailDialog.vue";
import SchemeSelector from "./SchemeSelector.vue";
defineEmits<{ course: [code: string] }>();
const props = defineProps<{ modules: ProgramModule[] }>(),
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
</script>
<template>
  <div class="program-offering-controls panel">
    <label for="program-offering-semester">开课学期</label>
    <select id="program-offering-semester" v-model="semester">
      <option
        v-for="term in semesters.data.value"
        :key="term.id"
        :value="term.id"
      >
        {{ term.name }}
      </option>
    </select>
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
    <article
      v-for="item in row.entries"
      :key="item.key"
      class="program-offering-course"
    >
      <h3>
        <span class="mono">{{ item.entry.course.code }}</span>
        <button
          class="course-name"
          @click="$emit('course', item.entry.course.code)"
        >
          {{ item.entry.course.name }}
        </button>
      </h3>
      <p class="muted">
        {{
          item.entry.compulsory === undefined
            ? "课程属性未提供"
            : item.entry.compulsory
              ? "必修"
              : "选修"
        }}
        · {{ item.entry.terms.join("、") || "建议学期未提供" }}
      </p>
      <p v-if="item.entry.remark">{{ item.entry.remark }}</p>
      <LessonList
        v-if="query.data.value"
        :lessons="item.lessons"
        :candidate-ids="candidateIds"
        :semester="semester"
        :compare-codes="[]"
        :show-compare="false"
        @detail="code = $event"
        @candidate="planner.toggle"
      />
      <p v-if="query.data.value && !item.lessons.length" class="muted">
        未找到公开开课
      </p>
      <p v-else-if="query.error.value || semesters.error.value" class="muted">
        开课状态未知
      </p>
    </article>
  </section>
  <LessonDetailDialog
    v-if="code && !query.loading.value"
    :code="code"
    :semester="semester"
    :detail="detail"
    :selected="!!detail && candidateIds.has(detail.id)"
    @close="code = ''"
    @candidate="planner.toggle"
  />
</template>
<style scoped>
.program-offering-controls {
  padding: 16px;
  margin: 16px 0;
}
.program-offering-controls > select {
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
  .program-offering-controls > select {
    display: block;
    margin: 8px 0;
    width: 100%;
  }
}
</style>
