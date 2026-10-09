<script setup lang="ts">
import { computed } from "vue";
import type { ProgramModule } from "../domain/models";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import QueryState from "./QueryState.vue";
const props = defineProps<{ module: ProgramModule; expanded: string[] }>();
const emit = defineEmits<{
  toggle: [id: string, open: boolean];
  course: [code: string];
}>();
const open = computed(() => props.expanded.includes(props.module.id));
const reference = useQuery(
  (signal, force) => catalog.module(props.module.publicId!, { signal, force }),
  () => props.module.publicId,
  () =>
    open.value &&
    !!props.module.publicId &&
    !props.module.courses.length &&
    !props.module.children.length,
);
const content = computed(() => reference.data.value ?? props.module);
function toggle(event: Event) {
  const value = (event.target as HTMLDetailsElement).open;
  if (value !== open.value) emit("toggle", props.module.id, value);
}
</script>
<template>
  <details class="program-module" :open="open" @toggle="toggle">
    <summary>
      <span>{{ module.name }}</span
      ><span class="module-credits">{{
        module.requiredCredits
          ? `要求 ${module.requiredCredits} 学分`
          : module.requiredCourses
            ? `要求 ${module.requiredCourses} 门课程`
            : "模块要求"
      }}</span>
    </summary>
    <div class="module-content">
      <p v-if="module.requirement" class="module-requirement">
        {{ module.requirement }}
      </p>
      <QueryState
        :loading="reference.loading.value"
        :error="reference.error.value"
        :meta="reference.meta.value"
        @retry="reference.reload"
      />
      <div v-if="content.courses.length" class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>课程</th>
              <th>学分</th>
              <th>属性</th>
              <th>建议学期</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in content.courses"
              :key="`${entry.course.code}:${index}`"
            >
              <td>
                <span class="course-code mono">{{ entry.course.code }}</span
                ><button
                  class="course-name"
                  @click="emit('course', entry.course.code)"
                >
                  {{ entry.course.name }}
                </button>
                <p v-if="entry.remark" class="course-en">{{ entry.remark }}</p>
              </td>
              <td>{{ entry.course.credits ?? "未提供" }}</td>
              <td>
                {{
                  entry.compulsory === undefined
                    ? "未提供"
                    : entry.compulsory
                      ? "必修"
                      : "选修"
                }}
              </td>
              <td>{{ entry.terms.join("、") || "未提供" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ProgramModule
        v-for="child in content.children"
        :key="child.id"
        :module="child"
        :expanded="expanded"
        @toggle="(id, value) => emit('toggle', id, value)"
        @course="emit('course', $event)"
      />
      <p
        v-if="
          !content.courses.length &&
          !content.children.length &&
          !reference.loading.value &&
          !reference.error.value
        "
        class="muted"
      >
        接口未提供该模块的课程条目。
      </p>
    </div>
  </details>
</template>
