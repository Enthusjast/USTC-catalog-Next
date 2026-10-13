<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useAttrs,
  type StyleValue,
} from "vue";
import { Input as VarInput } from "@varlet/ui";
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    disabled?: boolean;
    textarea?: boolean;
    placeholder?: string;
    rows?: string | number;
    maxlength?: string | number;
  }>(),
  { type: "text" },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  input: [event: Event];
  change: [event: Event];
}>();
const attrs = useAttrs();
const field = ref<InstanceType<typeof VarInput> & { $el: HTMLElement }>();
const native = computed(() =>
  ["date", "time", "datetime-local"].includes(props.type),
);
const rootAttrs = () =>
  Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) => key === "class" || key === "style" || key.startsWith("on"),
    ),
  );
const inputType = computed(() =>
  ["password", "number", "tel", "email"].includes(props.type)
    ? (props.type as "password" | "number" | "tel" | "email")
    : "text",
);
function control() {
  return field.value?.$el.querySelector("input, textarea") as
    HTMLInputElement | HTMLTextAreaElement | undefined;
}
function syncAttributes() {
  const input = control();
  if (!input) return;
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class" || key === "style" || key.startsWith("on")) continue;
    if ((value === false && !key.startsWith("aria-")) || value == null)
      input.removeAttribute(key);
    else {
      const attribute =
        value === true && !key.startsWith("aria-") ? "" : String(value);
      if (input.getAttribute(key) !== attribute)
        input.setAttribute(key, attribute);
    }
  }
  if (
    ["search", "number"].includes(props.type) &&
    input instanceof HTMLInputElement &&
    input.type !== props.type
  )
    input.type = props.type;
}
function nativeInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
  emit("input", event);
}
let observer: MutationObserver | undefined;
onMounted(async () => {
  await nextTick();
  syncAttributes();
  const input = control();
  if (input) {
    observer = new MutationObserver(syncAttributes);
    observer.observe(input, {
      attributes: true,
      attributeFilter: [
        "id",
        "aria-label",
        "aria-expanded",
        "aria-activedescendant",
        "required",
        "autocomplete",
      ],
    });
  }
});
onUpdated(() => nextTick(syncAttributes));
onBeforeUnmount(() => observer?.disconnect());
defineExpose({ focus: (options?: FocusOptions) => control()?.focus(options) });
</script>
<template>
  <div
    v-if="native"
    class="ui-native-field"
    :class="attrs.class"
    :style="attrs.style as StyleValue"
  >
    <input
      v-bind="attrs"
      :class="undefined"
      :style="undefined"
      :type="type"
      :value="modelValue"
      :disabled="disabled"
      @input="nativeInput"
      @change="emit('change', $event)"
    />
  </div>
  <VarInput
    v-else
    ref="field"
    v-bind="rootAttrs()"
    class="ui-input"
    variant="outlined"
    size="small"
    :hint="false"
    :model-value="String(modelValue ?? '')"
    :type="inputType"
    :disabled="disabled"
    :placeholder="placeholder"
    :textarea="textarea"
    :rows="rows"
    :maxlength="maxlength"
    @update:model-value="emit('update:modelValue', $event)"
    @input="(_value, event) => emit('input', event)"
    @change="(_value, event) => emit('change', event)"
  />
</template>
