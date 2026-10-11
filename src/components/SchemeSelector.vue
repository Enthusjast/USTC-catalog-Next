<script setup lang="ts">
import { ref, useId } from "vue";
import type { usePlanner } from "../features/usePlanner";
const props = defineProps<{ planner: ReturnType<typeof usePlanner> }>();
const action = ref<"" | "new" | "copy" | "rename">(""),
  name = ref(""),
  id = useId();
function open(mode: typeof action.value) {
  action.value = mode;
  name.value =
    mode === "rename"
      ? (props.planner.active.value?.name ?? "")
      : mode === "copy"
        ? `${props.planner.active.value?.name ?? "默认方案"} 副本`
        : "";
}
function save() {
  if (!name.value.trim()) return;
  if (action.value === "rename") props.planner.renameScheme(name.value);
  else props.planner.addScheme(name.value, action.value === "copy");
  action.value = "";
}
function remove() {
  if (confirm(`删除方案“${props.planner.active.value?.name}”及其中候选？`))
    props.planner.removeScheme();
}
</script>
<template>
  <div class="scheme-selector">
    <label :for="id">候选方案</label
    ><select
      :id="id"
      class="field-input"
      :value="planner.activeSchemeId.value"
      @change="
        planner.activeSchemeId.value = (
          $event.target as HTMLSelectElement
        ).value
      "
    >
      <option v-if="!planner.schemes.value.length" value="">默认方案</option>
      <option
        v-for="scheme in planner.schemes.value"
        :key="scheme.id"
        :value="scheme.id"
      >
        {{ scheme.name }}
      </option>
    </select>
    <div class="flex-actions">
      <button class="text-button" @click="open('new')">新建</button
      ><button
        class="text-button"
        :disabled="!planner.active.value"
        @click="open('copy')"
      >
        复制</button
      ><button
        class="text-button"
        :disabled="!planner.active.value"
        @click="open('rename')"
      >
        重命名</button
      ><button
        class="text-button"
        :disabled="!planner.active.value"
        @click="remove"
      >
        删除
      </button>
    </div>
    <form v-if="action" class="scheme-name-form" @submit.prevent="save">
      <label :for="`${id}-name`" class="sr-only">方案名称</label
      ><input
        :id="`${id}-name`"
        v-model="name"
        maxlength="40"
        required
        placeholder="方案名称"
        autofocus
      /><button class="button small" type="submit">保存</button
      ><button class="text-button" type="button" @click="action = ''">
        取消
      </button>
    </form>
  </div>
</template>
<style scoped>
.scheme-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.scheme-selector select {
  max-width: 100%;
  width: 200px;
}
.scheme-name-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-basis: 100%;
}
.scheme-name-form input {
  min-width: 0;
  flex: 1;
}
</style>
