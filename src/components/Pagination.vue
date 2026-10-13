<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
const props = withDefaults(
  defineProps<{ total: number; page: number; size?: number }>(),
  { size: 25 },
);
const emit = defineEmits<{ change: [page: number] }>();
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
const target = ref(String(props.page));
watch(
  () => props.page,
  (value) => {
    target.value = String(value);
  },
);
function jump() {
  const value = Number(target.value);
  if (!Number.isInteger(value) || value < 1 || value > pages.value) {
    target.value = String(props.page);
    return;
  }
  emit("change", value);
}
</script>
<template>
  <nav v-if="total > size" class="pagination" aria-label="结果分页">
    <span
      >共 {{ total }} 条 · 第 <strong>{{ page }}</strong> / {{ pages }} 页</span
    >
    <div class="pagination-controls">
      <UiButton
        class="icon-button"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="$emit('change', page - 1)"
      >
        <ChevronLeft :size="18" /></UiButton
      ><UiButton
        class="icon-button"
        :disabled="page >= pages"
        aria-label="下一页"
        @click="$emit('change', page + 1)"
      >
        <ChevronRight :size="18" />
      </UiButton>
      <form class="page-jump" @submit.prevent="jump">
        <label
          >前往<UiInput
            v-model="target"
            type="number"
            inputmode="numeric"
            min="1"
            :max="pages"
            required
            aria-label="跳转页码" /></label
        ><UiButton type="submit" class="text-button">跳转</UiButton>
      </form>
    </div>
  </nav>
</template>
