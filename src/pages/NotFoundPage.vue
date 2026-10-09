<script setup lang="ts">
import EmptyState from "../components/EmptyState.vue";
</script>
<template>
  <EmptyState
    title="没有找到这个页面"
    message="请检查分享链接，或返回首页开始查询。"
    ><RouterLink class="button" to="/">返回首页</RouterLink></EmptyState
  >
</template>
