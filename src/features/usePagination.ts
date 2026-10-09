import { computed, type Ref } from "vue";
import { useFilter } from "./useFilters";
export function usePagination<T>(items: Ref<T[]>, size = 25) {
  const requested = useFilter("page", "1");
  const page = computed(() =>
    Math.min(
      Math.max(1, Math.floor(Number(requested.value) || 1)),
      Math.max(1, Math.ceil(items.value.length / size)),
    ),
  );
  const visible = computed(() =>
    items.value.slice((page.value - 1) * size, page.value * size),
  );
  return {
    page,
    visible,
    change: (value: number) => {
      requested.value = String(value);
    },
  };
}
