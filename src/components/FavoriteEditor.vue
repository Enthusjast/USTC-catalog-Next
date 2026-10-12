<script setup lang="ts">
import { ref, shallowRef, useId, watch, nextTick } from "vue";
import { useFavorites } from "../features/useFavorites";
import { workspaceBusy } from "../features/useWorkspace";
import DisclosureDialog from "./DisclosureDialog.vue";
const props = defineProps<{ code: string }>(),
  favorites = useFavorites(),
  open = ref(false),
  group = ref(""),
  note = ref(""),
  id = useId(),
  input = ref<HTMLSelectElement>();
const base = shallowRef<{ groupId?: string; note: string }>({ note: "" });
watch(
  () => props.code,
  () => {
    open.value = false;
  },
);
function begin() {
  base.value = structuredClone(
    favorites.details.value[props.code] ?? { note: "" },
  );
  group.value = base.value.groupId ?? "";
  note.value = base.value.note;
  open.value = true;
}
watch(open, async (value) => {
  if (value) {
    await nextTick();
    input.value?.focus();
  }
});
async function save() {
  if (
    await favorites.saveDetails(
      props.code,
      { groupId: group.value || undefined, note: note.value },
      base.value,
    )
  )
    open.value = false;
}
</script>
<template>
  <button
    class="text-button"
    :disabled="workspaceBusy"
    :aria-label="`编辑 ${code} 收藏分组与备注`"
    @click="begin"
  >
    分组与备注
  </button>
  <DisclosureDialog
    :open="open"
    :title="`${code} · 收藏分组与备注`"
    @close="open = false"
    ><form class="favorite-editor" @submit.prevent="save">
      <label :for="`${id}-group`">分组</label
      ><select ref="input" :id="`${id}-group`" v-model="group">
        <option value="">未分组</option>
        <option
          v-for="entry in favorites.groups.value"
          :key="entry.id"
          :value="entry.id"
        >
          {{ entry.name }}
        </option>
      </select>
      <label :for="`${id}-note`">个人备注</label
      ><textarea :id="`${id}-note`" v-model="note" maxlength="1000" rows="6" />
      <p
        v-if="favorites.storageError.value"
        class="notice warning"
        role="status"
      >
        {{ favorites.storageError.value }}
      </p>
      <div class="flex-actions">
        <button class="button" :disabled="workspaceBusy">保存</button
        ><button type="button" class="button secondary" @click="open = false">
          取消
        </button>
      </div>
    </form></DisclosureDialog
  >
</template>
<style scoped>
.favorite-editor {
  display: grid;
  gap: 10px;
}
.favorite-editor textarea {
  width: 100%;
  min-width: 0;
  resize: vertical;
  padding: 10px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
}
</style>
