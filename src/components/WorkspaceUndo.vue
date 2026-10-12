<script setup lang="ts">
import { useWorkspaceUndo } from "../features/useWorkspaceUndo";
import { workspaceBusy } from "../features/useWorkspace";
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
const { last, undo } = useWorkspaceUndo();
const host = ref<HTMLElement>();
const bottom = ref("12px");
let observer: MutationObserver;
function locate() {
  host.value =
    document.querySelector<HTMLElement>("dialog[open] .dialog-content") ??
    document.body;
  const update = document.querySelector<HTMLElement>(".pwa-update");
  bottom.value = update ? `${update.offsetHeight + 24}px` : "12px";
}
onMounted(() => {
  locate();
  observer = new MutationObserver(locate);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  window.addEventListener("resize", locate);
});
watch(last, async () => {
  await nextTick();
  locate();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", locate);
});
</script>
<template>
  <Teleport v-if="last && host" :to="host"
    ><div
      class="flex-actions workspace-undo"
      :class="{ 'is-global': host.tagName === 'BODY' }"
      :style="host.tagName === 'BODY' ? { bottom } : undefined"
      role="status"
    >
      <span>{{ last.label }}</span
      ><button class="text-button" :disabled="workspaceBusy" @click="undo">
        撤销
      </button>
    </div></Teleport
  >
</template>
<style scoped>
.workspace-undo {
  position: sticky;
  bottom: 8px;
  z-index: 35;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  max-width: calc(100vw - 24px);
  box-shadow: var(--shadow);
  font-size: 13px;
}
.workspace-undo.is-global {
  position: fixed;
  left: 12px;
  bottom: 12px;
}
.workspace-undo button {
  min-height: 44px;
}
.workspace-undo span {
  min-width: 0;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
