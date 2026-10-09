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
function timestamp(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
function age(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60_000),
  );
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时`;
}
</script>
<template>
  <div v-if="loading" class="query-loading" role="status">
    <LoaderCircle class="spin" :size="18" />正在读取公开数据…
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
      <p v-if="error instanceof ApiError">
        本次查询失败时间 {{ timestamp(error.attemptedAt) }}
      </p>
      <p v-if="error instanceof ApiError && error.source" class="source-url">
        {{ error.source }}
      </p>
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
  <div
    v-else-if="meta"
    class="data-status"
    :class="{ stale: meta.state === 'stale' }"
    role="status"
  >
    <span class="status-label"
      ><span class="status-dot" />{{
        { online: "在线读取", cache: "本机缓存", stale: "离线 · 缓存已过期" }[
          meta.state
        ]
      }}</span
    ><span>查询时间 {{ timestamp(meta.retrievedAt) }}</span
    ><span v-if="meta.state !== 'online'"
      >缓存年龄 {{ age(meta.retrievedAt) }}</span
    ><a :href="meta.source" target="_blank" rel="noopener noreferrer"
      >数据来源<ArrowUpRight :size="13" /></a
    ><button class="text-button" @click="$emit('retry')">
      <RefreshCw :size="13" />刷新
    </button>
    <p v-if="meta.state === 'stale'">
      当前网络不可用，以下为本机保存的旧结果。查询时间不等于教务数据更新时间。
    </p>
  </div>
</template>
