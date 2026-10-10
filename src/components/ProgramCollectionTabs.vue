<script setup lang="ts">
import { GraduationCap, Archive, ArrowRight } from "@lucide/vue";
defineProps<{ current: "plans" | "archives" }>();
</script>
<template>
  <nav class="collection-tabs" aria-label="培养计划资料集合">
    <RouterLink
      to="/programs"
      class="collection-link"
      :class="{ active: current === 'plans' }"
      :aria-current="current === 'plans' ? 'page' : undefined"
    >
      <GraduationCap :size="21" /><span
        ><strong>执行计划</strong><small>按入学年级查看课程与要求</small></span
      ><ArrowRight :size="16" />
    </RouterLink>
    <RouterLink
      to="/archives"
      class="collection-link"
      :class="{ active: current === 'archives' }"
      :aria-current="current === 'archives' ? 'page' : undefined"
    >
      <Archive :size="21" /><span
        ><strong>历史培养方案</strong
        ><small>2013 级静态目录与历年官方附件</small></span
      ><ArrowRight :size="16" />
    </RouterLink>
  </nav>
</template>
