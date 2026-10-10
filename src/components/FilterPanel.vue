<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { SlidersHorizontal, X } from "@lucide/vue";
withDefaults(
  defineProps<{
    activeCount?: number;
    resultCount?: number;
    resultLabel?: string;
  }>(),
  { activeCount: 0, resultLabel: "条结果" },
);
const open = ref(false),
  panel = ref<HTMLElement>(),
  toggle = ref<HTMLButtonElement>();
let previousOverflow = "";
let desktop: MediaQueryList | undefined;
function closeOnDesktop() {
  if (desktop?.matches) open.value = false;
}
onMounted(() => {
  desktop = matchMedia("(min-width: 768px)");
  desktop.addEventListener("change", closeOnDesktop);
});
watch(open, async (value) => {
  if (value) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
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
  desktop?.removeEventListener("change", closeOnDesktop);
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
    <SlidersHorizontal :size="16" />筛选条件<span
      v-if="activeCount"
      class="filter-count"
      >{{ activeCount }}</span
    >
  </button>
  <button
    v-if="open"
    type="button"
    class="filter-backdrop"
    tabindex="-1"
    aria-label="关闭筛选条件"
    @click="open = false"
  />
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
      <span
        ><SlidersHorizontal :size="15" />筛选条件<span
          v-if="activeCount"
          class="filter-count"
          >{{ activeCount }}</span
        ></span
      ><button
        class="icon-button filter-close"
        aria-label="关闭筛选"
        @click="open = false"
      >
        <X :size="20" />
      </button>
    </h2>
    <slot />
    <div class="filter-panel-footer">
      <button type="button" class="button" @click="open = false">
        {{
          resultCount === undefined
            ? "查看查询结果"
            : `查看 ${resultCount} ${resultLabel}`
        }}
      </button>
    </div>
  </aside>
</template>
