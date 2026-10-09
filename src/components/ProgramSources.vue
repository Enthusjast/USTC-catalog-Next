<script setup lang="ts">
import type { Program } from "../domain/models";
import QueryState from "./QueryState.vue";
defineProps<{ program: Program }>();
defineEmits<{ refresh: [] }>();
</script>
<template>
  <div
    v-if="program.referenceIssues?.length"
    class="notice warning"
    role="status"
  >
    <div>
      <strong>公共模块读取不完整，相关课程状态未知</strong>
      <p
        v-for="issue in program.referenceIssues"
        :key="`${issue.moduleId}:${issue.publicId}`"
      >
        {{ issue.name }} (#{{ issue.publicId }})：{{ issue.message }}
        <a
          v-if="issue.source"
          :href="issue.source"
          target="_blank"
          rel="noopener noreferrer"
          >查看来源</a
        >
      </p>
      <button class="text-button" @click="$emit('refresh')">
        重试计划与公共模块
      </button>
    </div>
  </div>
  <details v-if="program.referenceSources?.length" class="reference-sources">
    <summary>
      公共模块数据来源（{{ program.referenceSources.length }} 个接口）
    </summary>
    <QueryState
      v-for="meta in program.referenceSources"
      :key="meta.source"
      :meta="meta"
      @retry="$emit('refresh')"
    />
  </details>
</template>
