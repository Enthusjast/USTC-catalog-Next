<script setup lang="ts">
import { ref, useId } from "vue";
import { useFavorites } from "../features/useFavorites";
import { workspaceBusy } from "../features/useWorkspace";
import DisclosureDialog from "./DisclosureDialog.vue";
const favorites = useFavorites(),
  open = ref(false),
  name = ref(""),
  id = useId(),
  rows = ref<{ id: string; base: string; name: string }[]>([]);
function begin() {
  rows.value = favorites.groups.value.map((g) => ({
    id: g.id,
    base: g.name,
    name: g.name,
  }));
  open.value = true;
}
async function create() {
  if (await favorites.createGroup(name.value)) {
    name.value = "";
    rows.value = favorites.groups.value.map((g) => ({
      id: g.id,
      base: g.name,
      name: g.name,
    }));
  }
}
async function rename(row: (typeof rows.value)[number]) {
  if (await favorites.renameGroup(row.id, row.name, row.base))
    row.base = row.name.trim();
}
async function remove(id: string) {
  if (await favorites.removeGroup(id))
    rows.value = rows.value.filter((r) => r.id !== id);
}
</script>
<template>
  <button class="text-button" :disabled="workspaceBusy" @click="begin">
    管理分组
  </button>
  <DisclosureDialog :open="open" title="收藏分组" @close="open = false"
    ><form class="flex-actions group-form" @submit.prevent="create">
      <label :for="`${id}-new`">新分组</label
      ><input :id="`${id}-new`" v-model="name" maxlength="40" required /><button
        class="button small"
        :disabled="workspaceBusy"
      >
        创建
      </button>
    </form>
    <div
      v-for="(row, index) in rows"
      :key="row.id"
      class="group-form flex-actions"
    >
      <label class="sr-only" :for="`${id}-${index}`"
        >修改分组 {{ row.base }}</label
      ><input :id="`${id}-${index}`" v-model="row.name" maxlength="40" /><button
        class="text-button"
        :disabled="workspaceBusy"
        @click="rename(row)"
      >
        保存</button
      ><button
        class="text-button"
        :disabled="workspaceBusy"
        @click="remove(row.id)"
      >
        删除
      </button>
    </div>
    <p v-if="favorites.storageError.value" class="notice warning" role="status">
      {{ favorites.storageError.value }}
    </p>
  </DisclosureDialog>
</template>
<style scoped>
.group-form {
  padding: 12px 0;
}
.group-form input {
  min-width: 0;
  flex: 1;
  max-width: 100%;
}
</style>
