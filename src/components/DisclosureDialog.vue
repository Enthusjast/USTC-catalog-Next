<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '@lucide/vue'
const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
let previous: HTMLElement | null = null
function sync(open: boolean) {
  if (open && !dialog.value?.open) { previous = document.activeElement as HTMLElement; dialog.value?.showModal() }
  else if (!open && dialog.value?.open) { dialog.value.close(); previous?.focus() }
}
watch(() => props.open, sync)
onMounted(() => sync(props.open))
onBeforeUnmount(() => { dialog.value?.close(); previous?.focus() })
</script>
<template><dialog ref="dialog" class="detail-dialog" aria-labelledby="dialog-title" @cancel.prevent="emit('close')" @click="event => { if (event.target === dialog) emit('close') }"><header><h2 id="dialog-title">{{ title }}</h2><button class="icon-button" aria-label="关闭详情" @click="emit('close')"><X :size="20" /></button></header><div class="dialog-content"><slot /></div></dialog></template>
