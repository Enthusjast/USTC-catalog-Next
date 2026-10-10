import { computed, type Ref } from "vue";

interface FilterDefinition {
  label: string;
  model: Ref<string>;
  display?: () => string | undefined;
  active?: () => boolean;
}

export function useFilterSummary(
  definitions: Record<string, FilterDefinition>,
) {
  const filters = computed(() =>
    Object.entries(definitions)
      .filter(([, field]) => !!field.model.value && (field.active?.() ?? true))
      .map(([key, field]) => ({
        key,
        label: field.label,
        value: field.model.value,
        display: field.display?.(),
      })),
  );
  const count = computed(() => filters.value.length);
  function remove(key: string) {
    const field = definitions[key];
    if (field) field.model.value = "";
  }
  return { filters, count, remove };
}
