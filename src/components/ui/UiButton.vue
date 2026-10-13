<script setup lang="ts">
import { normalizeClass, ref, useAttrs } from "vue";
import { Button as VarButton } from "@varlet/ui";
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
}>();
const attrs = useAttrs();
const bindings = (): Record<string, unknown> => ({ ...attrs });
const button = ref<InstanceType<typeof VarButton> & { $el: HTMLElement }>();
const hasClass = (name: string) =>
  normalizeClass(attrs.class).split(/\s+/).includes(name);
defineExpose({
  focus: (options?: FocusOptions) => button.value?.$el.focus(options),
});
</script>
<template>
  <VarButton
    ref="button"
    v-bind="bindings()"
    class="ui-button"
    :native-type="props.type ?? 'button'"
    :type="hasClass('button') ? 'primary' : 'default'"
    :text="!hasClass('button')"
    :tonal="hasClass('button') && hasClass('secondary')"
    :round="hasClass('icon-button')"
    :disabled="disabled"
    :loading="loading"
    :elevation="false"
    ><slot
  /></VarButton>
</template>
