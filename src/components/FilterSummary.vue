<script setup lang="ts">
import { computed } from "vue";
import { X } from "@lucide/vue";
const props = defineProps<{
  filters: { key: string; label: string; value?: string; display?: string }[];
}>();
defineEmits<{ remove: [key: string]; clear: [] }>();
const active = computed(() => props.filters.filter((filter) => !!filter.value));
</script>
<template>
  <div v-if="active.length" class="filter-summary" aria-label="已选筛选条件">
    <span class="filter-summary-label">已选 {{ active.length }} 项</span>
    <button
      v-for="filter in active"
      :key="filter.key"
      type="button"
      class="filter-chip"
      :aria-label="`移除${filter.label}筛选：${filter.display ?? filter.value}`"
      @click="$emit('remove', filter.key)"
    >
      <span
        >{{ filter.label
        }}<strong>{{ filter.display ?? filter.value }}</strong></span
      ><X :size="13" />
    </button>
    <button type="button" class="text-button" @click="$emit('clear')">
      清除全部
    </button>
  </div>
</template>
