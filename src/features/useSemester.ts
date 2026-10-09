import { computed } from "vue";
import { catalog } from "../api/catalog";
import { useQuery } from "./useQuery";
import { useFilter } from "./useFilters";
export function useSemester() {
  const query = useQuery((signal, force) =>
    catalog.semesters({ signal, force }),
  );
  const requested = useFilter("semester");
  const selected = computed({
    get: () =>
      requested.value ||
      query.data.value?.find((s) => s.current)?.id ||
      query.data.value?.[0]?.id ||
      "",
    set: (value) => {
      requested.value = value;
    },
  });
  const semester = computed(() =>
    query.data.value?.find((s) => s.id === selected.value),
  );
  return { ...query, selected, semester };
}
