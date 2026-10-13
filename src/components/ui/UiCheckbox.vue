<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useAttrs,
} from "vue";
import { Checkbox as VarCheckbox } from "@varlet/ui";
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    modelValue?: boolean | string[];
    checked?: boolean;
    value?: string;
    disabled?: boolean;
  }>(),
  { modelValue: undefined, checked: undefined },
);
const emit = defineEmits<{
  "update:modelValue": [value: boolean | string[]];
  change: [event: Event];
}>();
const attrs = useAttrs(),
  checkbox = ref<InstanceType<typeof VarCheckbox> & { $el: HTMLElement }>();
const bindings = (): Record<string, unknown> => ({ ...attrs });
const checked = computed(() =>
  Array.isArray(props.modelValue)
    ? props.modelValue.includes(props.value ?? "")
    : (props.modelValue ?? props.checked ?? false),
);
function change(value: boolean) {
  const result = Array.isArray(props.modelValue)
    ? value
      ? [...new Set([...props.modelValue, props.value ?? ""])]
      : props.modelValue.filter((item) => item !== props.value)
    : value;
  emit("update:modelValue", result);
  emit("change", {
    target: { checked: value, value: props.value },
  } as unknown as Event);
}
function label() {
  const root = checkbox.value?.$el as HTMLElement | undefined;
  const control = root?.querySelector<HTMLElement>('[role="checkbox"]');
  const parent = root?.closest("label");
  if (control && parent)
    control.setAttribute("aria-label", parent.textContent?.trim() ?? "");
  if (attrs["aria-label"])
    control?.setAttribute("aria-label", String(attrs["aria-label"]));
}
let parent: HTMLLabelElement | null | undefined;
function clickLabel(event: MouseEvent) {
  if (
    !props.disabled &&
    event.target instanceof Node &&
    !checkbox.value?.$el.contains(event.target)
  )
    change(!checked.value);
}
onMounted(() => {
  label();
  parent = checkbox.value?.$el.closest("label");
  parent?.addEventListener("click", clickLabel);
});
onUpdated(label);
onBeforeUnmount(() => parent?.removeEventListener("click", clickLabel));
</script>
<template>
  <VarCheckbox
    ref="checkbox"
    v-bind="bindings()"
    class="ui-checkbox"
    :model-value="checked"
    :disabled="disabled"
    @update:model-value="change"
  />
</template>
