<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  timetableImagePages,
  renderTimetablePNG,
  printTimetable,
  type TimetableExportData,
} from "../domain/timetableExport";
import { downloadFile } from "../domain/download";
import DisclosureDialog from "./DisclosureDialog.vue";
const props = defineProps<{ data: TimetableExportData }>();
const open = ref(false),
  pages = ref<ReturnType<typeof timetableImagePages>>([]),
  selected = ref(0),
  message = ref("");
const image = computed(() =>
  open.value && pages.value[selected.value]
    ? renderTimetablePNG(
        props.data,
        pages.value[selected.value]!,
        selected.value,
      )
    : "",
);
watch(
  () => props.data,
  () => {
    open.value = false;
    pages.value = [];
  },
);
function preview() {
  try {
    pages.value = timetableImagePages(props.data);
    selected.value = 0;
    open.value = true;
    message.value = "";
  } catch (error) {
    message.value = (error as Error).message;
  }
}
async function save() {
  const blob = await fetch(image.value).then((r) => r.blob());
  downloadFile(
    blob,
    `ustc-timetable-week-${props.data.week}-${selected.value + 1}.png`,
  );
}
function print() {
  try {
    printTimetable(props.data);
  } catch (error) {
    message.value = (error as Error).message;
  }
}
</script>
<template>
  <div class="timetable-export flex-actions">
    <UiButton
      class="text-button"
      :disabled="!data.lessons.length"
      @click="preview"
    >
      导出 PNG</UiButton
    ><UiButton
      class="text-button"
      :disabled="!data.lessons.length"
      @click="print"
    >
      打印 / PDF
    </UiButton>
    <p v-if="message" role="status">{{ message }}</p>
  </div>
  <DisclosureDialog :open="open" title="课表图片导出" @close="open = false"
    ><div class="flex-actions">
      <label for="timetable-image-page">图片</label
      ><UiSelect id="timetable-image-page" v-model="selected">
        <option v-for="(_, i) in pages" :key="i" :value="i">
          {{ i + 1 }} / {{ pages.length }}
        </option></UiSelect
      ><UiButton class="button small" @click="save">保存此张 PNG</UiButton>
    </div>
    <img
      class="timetable-export-preview"
      :src="image"
      alt="课表及完整安排清单预览"
  /></DisclosureDialog>
</template>
<style scoped>
.timetable-export {
  margin: 8px 0;
}
.timetable-export-preview {
  width: 100%;
  height: auto;
  margin-top: 16px;
  border: 1px solid var(--border);
}
.timetable-export .ui-select {
  width: auto;
}
</style>
