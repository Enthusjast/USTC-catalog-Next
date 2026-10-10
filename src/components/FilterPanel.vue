<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, useId } from "vue";
import { SlidersHorizontal, X } from "@lucide/vue";
withDefaults(
  defineProps<{
    activeCount?: number;
    resultCount?: number;
    resultLabel?: string;
    layout?: "sidebar" | "inline";
  }>(),
  { activeCount: 0, resultLabel: "条结果", layout: "sidebar" },
);
const open = ref(false),
  mobile = ref(false),
  panel = ref<HTMLElement>(),
  toggle = ref<HTMLButtonElement>(),
  headingId = useId();
let previousOverflow: string | undefined;
let desktop: MediaQueryList | undefined;
function updateLayout() {
  if (desktop?.matches) open.value = false;
  mobile.value = !desktop?.matches;
}
function restoreScroll() {
  if (previousOverflow === undefined) return;
  document.body.style.overflow = previousOverflow;
  previousOverflow = undefined;
}
onMounted(() => {
  desktop = matchMedia("(min-width: 768px)");
  updateLayout();
  desktop.addEventListener("change", updateLayout);
});
watch([open, mobile], async () => {
  await nextTick();
  const dialog = panel.value;
  if (mobile.value && open.value && dialog instanceof HTMLDialogElement) {
    if (previousOverflow === undefined) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    if (!dialog.open) dialog.showModal();
  } else {
    if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
    restoreScroll();
  }
});
function close() {
  open.value = false;
  void nextTick(() => {
    if (mobile.value) toggle.value?.focus();
  });
}
function closeOnBackdrop(event: MouseEvent) {
  if (!mobile.value || event.target !== panel.value) return;
  const bounds = panel.value.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    close();
}
onBeforeUnmount(() => {
  desktop?.removeEventListener("change", updateLayout);
  if (panel.value instanceof HTMLDialogElement) panel.value.close();
  restoreScroll();
});
</script>
<template>
  <div v-if="mobile && $slots.primary" class="filter-primary panel">
    <slot name="primary" />
  </div>
  <button
    ref="toggle"
    type="button"
    class="button secondary filter-toggle"
    :aria-expanded="open"
    :aria-controls="`${headingId}-panel`"
    aria-haspopup="dialog"
    @click="open = true"
  >
    <SlidersHorizontal :size="16" />筛选条件<span
      v-if="activeCount"
      class="filter-count"
      >{{ activeCount }}</span
    >
  </button>
  <component
    :is="mobile ? 'dialog' : 'aside'"
    :id="`${headingId}-panel`"
    ref="panel"
    class="filter-panel panel"
    :class="{ 'is-open': open, 'filter-panel--inline': layout === 'inline' }"
    :aria-labelledby="headingId"
    @cancel.prevent="close"
    @click="closeOnBackdrop"
  >
    <h2 :id="headingId">
      <span
        ><SlidersHorizontal :size="15" />筛选条件<span
          v-if="activeCount"
          class="filter-count"
          >{{ activeCount }}</span
        ></span
      ><button
        type="button"
        class="icon-button filter-close"
        aria-label="关闭筛选"
        @click="close"
      >
        <X :size="20" />
      </button>
    </h2>
    <div class="filter-panel-body">
      <slot v-if="!mobile" name="primary" />
      <slot />
    </div>
    <div class="filter-panel-footer">
      <button type="button" class="button" @click="close">
        {{
          resultCount === undefined
            ? "查看查询结果"
            : `查看 ${resultCount} ${resultLabel}`
        }}
      </button>
    </div>
  </component>
</template>
