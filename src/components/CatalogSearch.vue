<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Search, ArrowRight } from "@lucide/vue";
import { catalog } from "../api/catalog";
import { useQuery } from "../features/useQuery";
import { useDebounced } from "../features/useFilters";
const props = withDefaults(
  defineProps<{ id: string; compact?: boolean; initial?: string }>(),
  { initial: "" },
);
const router = useRouter(),
  keyword = ref(props.initial),
  debounced = useDebounced(keyword),
  focused = ref(false),
  selected = ref(-1);
const suggestions = useQuery(
  (signal, force) => catalog.search(debounced.value.trim(), { signal, force }),
  debounced,
  () => focused.value && debounced.value.trim().length >= 2,
);
const items = computed(() => suggestions.data.value?.slice(0, 5) ?? []),
  visible = computed(() => focused.value && !!items.value.length);
watch(keyword, () => {
  selected.value = -1;
});
watch(
  () => props.initial,
  (value) => {
    keyword.value = value;
  },
);
function submit() {
  const item =
    visible.value && selected.value >= 0
      ? items.value[selected.value]
      : undefined;
  if (item) choose(item.code);
  else if (keyword.value.trim()) {
    focused.value = false;
    void router.push({ path: "/search", query: { q: keyword.value.trim() } });
  }
}
function choose(code: string) {
  focused.value = false;
  void router.push({
    path: "/courses",
    query: { q: code, course: code, history: "1" },
  });
}
function move(delta: number) {
  if (!visible.value) return;
  selected.value =
    (selected.value + delta + items.value.length) % items.value.length;
}
function focusOut(event: FocusEvent) {
  if (
    !(event.currentTarget as HTMLElement).contains(
      event.relatedTarget as Node | null,
    )
  )
    focused.value = false;
}
</script>
<template>
  <div class="search-container" :class="{ compact }" @focusout="focusOut">
    <form
      :class="compact ? 'global-search' : 'hero-search'"
      @submit.prevent="submit"
    >
      <label :for="id"
        ><Search :size="compact ? 17 : 24" /><span class="sr-only"
          >课程名称、编号、教师、院系或教室</span
        ></label
      ><input
        :id="id"
        v-model="keyword"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="visible"
        :aria-controls="`${id}-suggestions`"
        :aria-activedescendant="
          selected >= 0 && visible ? `${id}-suggestion-${selected}` : undefined
        "
        placeholder="课程名称、编号、教师、院系或教室"
        autocomplete="off"
        @focus="focused = true"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="focused = false"
      /><button type="submit">
        {{ compact ? "搜索" : "开始查询"
        }}<ArrowRight v-if="!compact" :size="18" />
      </button>
    </form>
    <ul
      v-if="visible"
      :id="`${id}-suggestions`"
      role="listbox"
      aria-label="课程搜索建议"
      class="search-suggestions"
    >
      <li
        v-for="(course, index) in items"
        :id="`${id}-suggestion-${index}`"
        :key="course.code"
        role="option"
        :aria-selected="selected === index"
        :class="{ selected: selected === index }"
        @pointerdown.prevent="choose(course.code)"
      >
        <span class="mono">{{ course.code }}</span
        ><strong>{{ course.name }}</strong
        ><small>{{ course.valid ? "当前有效" : "历史课程" }}</small>
      </li>
      <li class="suggestion-hint" role="presentation">
        按 ↑ ↓ 选择课程，Enter 查询；直接搜索可查看教学班和计划。
      </li>
    </ul>
  </div>
</template>
