<script setup lang="ts">
import { ref } from "vue";
import {
  exportWorkspace,
  previewWorkspaceImport,
  importWorkspace,
  workspaceStorageError,
  workspaceBusy,
} from "../features/useWorkspace";
import type { WorkspaceBackup } from "../domain/workspace";
import { downloadFile } from "../domain/download";
const preview = ref<WorkspaceBackup>(),
  text = ref(""),
  message = ref("");
function exportJSON() {
  try {
    downloadFile(
      exportWorkspace(),
      `ustc-catalog-next-backup-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json",
    );
  } catch (error) {
    message.value = (error as Error).message;
  }
}
async function selectFile(event: Event) {
  preview.value = undefined;
  text.value = "";
  message.value = "";
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("备份文件不能超过 5 MB。");
    const source = await file.text();
    preview.value = previewWorkspaceImport(source);
    text.value = source;
  } catch (error) {
    message.value = (error as Error).message;
  } finally {
    (event.target as HTMLInputElement).value = "";
  }
}
async function importJSON() {
  if (await importWorkspace(text.value)) {
    preview.value = undefined;
    text.value = "";
    message.value = "备份已导入，现有方案和收藏已保留。";
  } else message.value = workspaceStorageError.value;
}
</script>
<template>
  <section class="workspace-backup">
    <h2>候选方案与收藏备份</h2>
    <div class="flex-actions">
      <UiButton
        class="button secondary"
        :disabled="workspaceBusy"
        @click="exportJSON"
      >
        导出 JSON</UiButton
      ><label class="button secondary backup-file-label"
        >选择备份文件<input
          type="file"
          accept="application/json,.json"
          :disabled="workspaceBusy"
          @change="selectFile"
      /></label>
    </div>
    <div v-if="preview" class="notice">
      <p>
        将新增
        {{
          Object.values(preview.semesters).reduce(
            (n, s) => n + s.schemes.length,
            0,
          )
        }}
        个方案，合并
        {{ preview.favorites.length }} 门收藏、{{
          preview.favoriteGroups.length
        }}
        个分组及
        {{ preview.roomFavorites.length }}
        间常用教室。现有方案保留，同名方案自动更名。
      </p>
      <div class="flex-actions">
        <UiButton
          class="button small"
          :disabled="workspaceBusy"
          @click="importJSON"
        >
          确认导入</UiButton
        ><UiButton
          class="text-button"
          @click="
            preview = undefined;
            text = '';
          "
        >
          取消
        </UiButton>
      </div>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
<style scoped>
.workspace-backup {
  margin: 20px 0;
}
.backup-file-label {
  position: relative;
  overflow: hidden;
}
.backup-file-label input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.backup-file-label:focus-within {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
</style>
