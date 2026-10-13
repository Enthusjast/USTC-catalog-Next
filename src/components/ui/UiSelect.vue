<script setup lang="ts">
import {
  computed,
  Fragment,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useAttrs,
  useId,
  useSlots,
  type VNode,
} from "vue";
import { Select as VarSelect, Option as VarOption } from "@varlet/ui";
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  modelValue?: string | number;
  value?: string | number;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [event: Event];
}>();
const attrs = useAttrs(),
  slots = useSlots(),
  select = ref<InstanceType<typeof VarSelect> & { $el: HTMLElement }>();
const menuId = `select-${useId()}-options`;
function text(nodes: unknown): string {
  if (typeof nodes === "string" || typeof nodes === "number")
    return String(nodes);
  if (Array.isArray(nodes)) return nodes.map(text).join("");
  if (nodes && typeof nodes === "object" && "children" in nodes)
    return text((nodes as VNode).children);
  return "";
}
function options(
  nodes: VNode[],
): { label: string; value: string; disabled: boolean }[] {
  return nodes.flatMap((node) => {
    if (node.type === Fragment) return options(node.children as VNode[]);
    if (node.type !== "option") return [];
    const label = text(node.children).trim();
    return [
      {
        label,
        value: String(node.props?.value ?? label),
        disabled: node.props?.disabled === "" || !!node.props?.disabled,
      },
    ];
  });
}
const bindings = (): Record<string, unknown> => ({ ...attrs });
const choices = computed(() => options(slots.default?.() ?? []));
const selected = computed(() => String(props.modelValue ?? props.value ?? ""));
const selectedLabel = computed(
  () =>
    choices.value.find((option) => option.value === selected.value)?.label ??
    "",
);
function change(value: string) {
  emit("update:modelValue", value);
  emit("change", { target: { value } } as unknown as Event);
}
function label() {
  const root = select.value?.$el as HTMLElement | undefined;
  if (!root) return;
  const menu = root.querySelector<HTMLElement>(".var-select__scroller");
  menu?.setAttribute("role", "listbox");
  menu?.setAttribute("id", menuId);
  root.setAttribute("aria-controls", menuId);
  root.setAttribute(
    "aria-expanded",
    String(!!root.querySelector(".var-select--arrow-rotate")),
  );
  if (!attrs["aria-label"] && !attrs["aria-labelledby"]) {
    const external =
      typeof attrs.id === "string"
        ? document.querySelector<HTMLLabelElement>(
            `label[for="${CSS.escape(String(attrs.id))}"]`,
          )
        : null;
    const surrounding = external || root.closest("label");
    if (surrounding) {
      const copy = surrounding.cloneNode(true) as HTMLElement;
      copy.querySelectorAll(".ui-select").forEach((el) => el.remove());
      root.setAttribute("aria-label", copy.textContent?.trim() ?? "");
    }
  }
}
let observer: MutationObserver | undefined;
onMounted(async () => {
  await nextTick();
  label();
  const root = select.value?.$el;
  if (root) {
    observer = new MutationObserver(label);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }
});
onUpdated(() => nextTick(label));
onBeforeUnmount(() => observer?.disconnect());
defineExpose({ focus: () => select.value?.focus() });
</script>
<template>
  <VarSelect
    ref="select"
    v-bind="bindings()"
    class="ui-select"
    variant="outlined"
    size="small"
    :hint="false"
    :model-value="selected"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :data-value="selected"
    role="combobox"
    aria-haspopup="listbox"
    :placeholder="
      choices.find((option) => option.value === selected)?.label ??
      choices[0]?.label
    "
    @update:model-value="change"
    @focus="nextTick(label)"
  >
    <template #selected>{{ selectedLabel }}</template>
    <VarOption
      v-for="option in choices"
      :key="option.value"
      :label="option.label"
      :value="option.value"
      :disabled="option.disabled"
      role="option"
      :aria-selected="option.value === selected"
      :data-value="option.value"
    />
  </VarSelect>
</template>
