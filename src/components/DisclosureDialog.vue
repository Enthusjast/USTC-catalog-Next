<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, useId } from "vue";
import { X } from "@lucide/vue";
const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>(),
  titleId = useId();
let previous: HTMLElement | null = null;
let pressedOutside = false;
function outside(event: MouseEvent) {
  const bounds = dialog.value?.getBoundingClientRect();
  return (
    !!bounds &&
    (event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom)
  );
}
function pointerDown(event: PointerEvent) {
  pressedOutside = event.target === dialog.value && outside(event);
}
function click(event: MouseEvent) {
  const close =
    pressedOutside && event.target === dialog.value && outside(event);
  pressedOutside = false;
  if (close) emit("close");
}
function restoreFocus() {
  if (previous?.isConnected) previous.focus({ preventScroll: true });
}
function sync(open: boolean) {
  pressedOutside = false;
  if (open && !dialog.value?.open) {
    previous = document.activeElement as HTMLElement;
    dialog.value?.showModal();
  } else if (!open && dialog.value?.open) {
    dialog.value.close();
    restoreFocus();
  }
}
watch(() => props.open, sync);
onMounted(() => sync(props.open));
onBeforeUnmount(() => {
  dialog.value?.close();
  restoreFocus();
});
</script>
<template>
  <dialog
    ref="dialog"
    class="detail-dialog"
    :aria-labelledby="titleId"
    @cancel.prevent="emit('close')"
    @pointerdown="pointerDown"
    @pointercancel="pressedOutside = false"
    @click="click"
  >
    <VarPaper class="dialog-paper" :elevation="false">
      <header>
        <h2 :id="titleId">{{ title }}</h2>
        <UiButton
          class="icon-button"
          aria-label="关闭详情"
          @click="emit('close')"
        >
          <X :size="20" />
        </UiButton>
      </header>
      <div class="dialog-content"><slot /></div>
    </VarPaper>
  </dialog>
</template>
