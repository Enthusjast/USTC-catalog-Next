<script setup lang="ts">
import { SearchX } from '@lucide/vue'
withDefaults(defineProps<{ title?: string; message?: string }>(), { title: '没有找到符合条件的结果', message: '尝试修改关键词、清除筛选，或查看历史课程。' })
</script>
<template><div class="empty-state"><SearchX :size="32" /><h2>{{ title }}</h2><p>{{ message }}</p><slot /></div></template>
