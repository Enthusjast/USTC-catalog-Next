<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { SlidersHorizontal, X } from "@lucide/vue";
const open = ref(false),
  panel = ref<HTMLElement>(),
  toggle = ref<HTMLButtonElement>();
let previousOverflow = "";
watch(open, async (value) => {
  if (value) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await Promise.resolve();
    panel.value?.querySelector<HTMLElement>("button,input,select")?.focus();
  } else {
    document.body.style.overflow = previousOverflow;
    toggle.value?.focus();
  }
});
function trap(event: KeyboardEvent) {
  if (!open.value || event.key !== "Tab") return;
  const items = panel.value?.querySelectorAll<HTMLElement>(
    "button,input,select,a[href]",
  );
  if (!items?.length) return;
  const first = items[0],
    last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onBeforeUnmount(() => {
  if (open.value) document.body.style.overflow = previousOverflow;
});
</script>
<template>
  <button
    ref="toggle"
    class="button secondary filter-toggle"
    :aria-expanded="open"
    @click="open = true"
  >
    <SlidersHorizontal :size="16" />筛选条件
  </button>
  <aside
    ref="panel"
    class="filter-panel panel"
    :class="{ 'is-open': open }"
    :role="open ? 'dialog' : undefined"
    :aria-modal="open ? true : undefined"
    aria-label="筛选条件"
    @keydown.esc="open = false"
    @keydown="trap"
  >
    <h2>
      筛选条件<button
        class="icon-button filter-close"
        aria-label="关闭筛选"
        @click="open = false"
      >
        <X :size="20" />
      </button>
    </h2>
    <slot />
  </aside>
</template>
