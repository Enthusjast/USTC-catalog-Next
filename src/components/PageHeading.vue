<script setup lang="ts">
defineProps<{ title: string; description: string; eyebrow?: string }>();
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ eyebrow ?? "PUBLIC CATALOG / 公共查询" }}</p>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="heading-actions"><slot /></div>
  </div>
</template>
