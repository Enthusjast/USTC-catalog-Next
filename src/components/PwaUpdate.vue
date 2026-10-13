<script setup lang="ts">
import { ref } from "vue";
import { RefreshCw, X } from "@lucide/vue";
import { usePWA } from "../features/usePWA";
const { needRefresh, updating, update, message } = usePWA();
const dismissed = ref(false);
</script>

<template>
  <aside
    v-if="needRefresh && !dismissed"
    class="pwa-update"
    aria-label="应用更新"
  >
    <UiButton class="button secondary" :disabled="updating" @click="update">
      <RefreshCw :size="16" />{{ updating ? "正在更新…" : "更新应用" }}
    </UiButton>
    <UiButton
      class="icon-button"
      aria-label="稍后更新"
      @click="dismissed = true"
    >
      <X :size="16" />
    </UiButton>
    <p v-if="message" role="status">{{ message }}</p>
  </aside>
</template>

<style scoped>
.pwa-update {
  position: fixed;
  z-index: 35;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  max-width: calc(100vw - 24px);
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 4px 20px #0002;
}
.pwa-update p {
  flex-basis: 100%;
  margin: 4px;
  font-size: 13px;
}
@media print {
  .pwa-update {
    display: none;
  }
}
</style>
