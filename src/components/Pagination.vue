<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
const props = withDefaults(
  defineProps<{ total: number; page: number; size?: number }>(),
  { size: 25 },
);
defineEmits<{ change: [page: number] }>();
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
</script>
<template>
  <nav v-if="total > size" class="pagination" aria-label="结果分页">
    <span>共 {{ total }} 条 · 第 {{ page }} / {{ pages }} 页</span>
    <div>
      <button
        class="icon-button"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="$emit('change', page - 1)"
      >
        <ChevronLeft :size="18" /></button
      ><button
        class="icon-button"
        :disabled="page >= pages"
        aria-label="下一页"
        @click="$emit('change', page + 1)"
      >
        <ChevronRight :size="18" />
      </button>
    </div>
  </nav>
</template>
