<script setup lang="ts">
import type { Ref } from "vue";
defineProps<{
  fields: {
    key: string;
    label: string;
    model: Ref<string>;
    values: string[];
  }[];
  disabled?: boolean;
  busy?: boolean;
}>();
</script>
<template>
  <div v-for="field in fields" :key="field.key" class="filter-field">
    <label :for="`lesson-${field.key}`">{{ field.label }}</label
    ><select
      :id="`lesson-${field.key}`"
      :value="field.model.value"
      :disabled="disabled"
      :aria-busy="busy"
      @change="field.model.value = ($event.target as HTMLSelectElement).value"
    >
      <option value="">{{ busy ? "正在读取…" : "不限" }}</option>
      <option v-for="value in field.values" :key="value" :value="value">
        {{ value === "__missing__" ? "未提供" : value }}
      </option>
    </select>
  </div>
</template>
