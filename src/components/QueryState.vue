<script setup lang="ts">
import {
  AlertTriangle,
  LoaderCircle,
  RefreshCw,
  ArrowUpRight,
} from "@lucide/vue";
import type { QueryMeta } from "../domain/models";
import { ApiError } from "../api/client";
defineProps<{ loading?: boolean; error?: Error; meta?: QueryMeta }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="query-loading" role="status" aria-label="正在加载">
    <LoaderCircle class="spin" :size="18" aria-hidden="true" />
  </div>
  <div v-else-if="error" class="notice error" role="alert">
    <AlertTriangle :size="20" />
    <div>
      <strong>{{
        error instanceof ApiError && error.kind === "restricted"
          ? "公开查询受限"
          : "数据暂时无法读取"
      }}</strong>
      <p>{{ error.message }}</p>
      <div class="flex-actions">
        <button class="button small secondary" @click="$emit('retry')">
          <RefreshCw :size="15" />重新查询</button
        ><a
          href="https://jw.ustc.edu.cn/"
          target="_blank"
          rel="noopener noreferrer"
          >综合教务系统<ArrowUpRight :size="14"
        /></a>
      </div>
    </div>
  </div>
</template>
