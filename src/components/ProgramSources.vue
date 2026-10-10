<script setup lang="ts">
import type { Program } from "../domain/models";
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
      </p>
      <button class="text-button" @click="$emit('refresh')">
        重试计划与公共模块
      </button>
    </div>
  </div>
</template>
