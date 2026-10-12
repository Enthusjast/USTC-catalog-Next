<script setup lang="ts">
import { computed, shallowRef, ref, watch } from "vue";
import type { Lesson } from "../domain/models";
import type { usePlanner } from "../features/usePlanner";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { editWorkspace, workspaceBusy } from "../features/useWorkspace";
import { candidateUpdates } from "../domain/lessonUpdates";
import DisclosureDialog from "./DisclosureDialog.vue";
import QueryState from "./QueryState.vue";
const props = defineProps<{
  planner: ReturnType<typeof usePlanner>;
  semester: string;
}>();
const run = shallowRef<{
    term: string;
    id: string;
    before: Lesson[];
    token: number;
  }>(),
  selected = ref<string[]>([]),
  message = ref("");
let token = 0;
const query = useQuery(
  (signal) => catalog.lessons(run.value!.term, { signal, force: true }),
  () => run.value?.token,
  () => !!run.value,
);
const rows = computed(() =>
  candidateUpdates(run.value?.before ?? [], query.data.value ?? []),
);
const changed = computed(() =>
  rows.value.filter((row) => row.status === "changed"),
);
const stale = computed(
  () =>
    !!run.value &&
    JSON.stringify(run.value.before) !==
      JSON.stringify(props.planner.lessons.value),
);
watch(query.data, (data) => {
  if (data) selected.value = changed.value.map((row) => row.before.id);
});
watch(
  () => [props.semester, props.planner.activeSchemeId.value],
  () => {
    run.value = undefined;
  },
);
function begin() {
  const scheme = props.planner.active.value;
  if (!scheme) return;
  message.value = "";
  run.value = {
    term: props.semester,
    id: scheme.id,
    before: structuredClone(scheme.lessons),
    token: ++token,
  };
}
async function apply() {
  const snapshot = run.value;
  if (!snapshot || stale.value || !query.data.value) return;
  const replacements = new Map(
    changed.value
      .filter((row) => selected.value.includes(row.before.id))
      .map((row) => [row.before.id, row.after!]),
  );
  const ok = await editWorkspace((next) => {
    const scheme = next.semesters[snapshot.term]?.schemes.find(
      (s) => s.id === snapshot.id,
    );
    if (
      !scheme ||
      JSON.stringify(scheme.lessons) !== JSON.stringify(snapshot.before)
    )
      throw new Error("方案已变化，请重新比较。");
    scheme.lessons = scheme.lessons.map(
      (lesson) => replacements.get(lesson.id) ?? lesson,
    );
    scheme.savedAt = new Date().toISOString();
  });
  if (ok) {
    run.value = undefined;
    message.value = `已更新 ${replacements.size} 个教学班。`;
  }
}
</script>
<template>
  <button
    class="text-button"
    :disabled="workspaceBusy || !planner.lessons.value.length"
    @click="begin"
  >
    检查候选安排更新
  </button>
  <p v-if="message" role="status">{{ message }}</p>
  <DisclosureDialog
    :open="!!run"
    title="候选安排更新预览"
    @close="run = undefined"
  >
    <QueryState
      :loading="query.loading.value"
      :error="query.error.value"
      @retry="query.reload"
    />
    <template v-if="query.data.value">
      <div class="flex-actions">
        <span>{{ changed.length }} 项有变化</span
        ><button v-if="stale" class="text-button" @click="begin">
          方案已变化，重新比较
        </button>
      </div>
      <article
        v-for="row in rows"
        :key="row.before.id"
        class="update-preview-row"
      >
        <label v-if="row.status === 'changed'"
          ><input v-model="selected" type="checkbox" :value="row.before.id" />{{
            row.before.course.name
          }}
          · {{ row.before.code }}</label
        >
        <strong v-else
          >{{ row.before.course.name }} · {{ row.before.code }}</strong
        >
        <p v-if="row.status === 'missing'">未找到当前公开记录，保留原安排。</p>
        <p v-else-if="row.status === 'ambiguous'">无法唯一关联，保留原安排。</p>
        <p v-else-if="row.status === 'same'">无变化</p>
        <dl v-else>
          <div v-for="field in row.fields" :key="field.label">
            <dt>{{ field.label }}</dt>
            <dd>{{ field.before }} → {{ field.after }}</dd>
          </div>
        </dl>
      </article>
      <button
        class="button"
        :disabled="workspaceBusy || stale || !selected.length"
        @click="apply"
      >
        确认更新所选项
      </button>
    </template>
  </DisclosureDialog>
</template>
<style scoped>
.update-preview-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  overflow-wrap: anywhere;
}
.update-preview-row label {
  display: flex;
  gap: 8px;
  align-items: center;
}
.update-preview-row dl {
  display: grid;
  gap: 8px;
  margin: 8px 0;
  font-size: 13px;
}
.update-preview-row dl > div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 8px;
}
.update-preview-row dt {
  color: var(--muted);
}
.update-preview-row dd {
  margin: 0;
  white-space: pre-wrap;
}
</style>
