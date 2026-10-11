import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { ProgramSummary } from "../domain/models";
import { programMatches } from "../domain/search";
import { useFilter } from "./useFilters";

export function useProgramFilters(
  programs: MaybeRefOrGetter<ProgramSummary[] | undefined>,
  prefix = "",
) {
  const field = (name: string) =>
    useFilter(prefix ? `${prefix}-${name}` : name);
  const q = field("q"),
    dept = field("dept"),
    type = field("type"),
    grade = field("grade");
  const source = computed(() => toValue(programs) ?? []);
  const departments = computed(() => [
    ...new Set(source.value.map((p) => p.department)),
  ]);
  const types = computed(() => [
    ...new Set(source.value.map((p) => p.trainType)),
  ]);
  const grades = computed(() =>
    [...new Set(source.value.map((p) => p.grade))].sort().reverse(),
  );
  const filtered = computed(() =>
    source.value.filter(
      (p) =>
        programMatches(p, q.value) &&
        (!dept.value || p.department === dept.value) &&
        (!type.value || p.trainType === type.value) &&
        (!grade.value || p.grade === grade.value),
    ),
  );
  const active = computed(
    () => !!(q.value || dept.value || type.value || grade.value),
  );
  function clear() {
    q.value = "";
    dept.value = "";
    type.value = "";
    grade.value = "";
  }
  return {
    q,
    dept,
    type,
    grade,
    departments,
    types,
    grades,
    filtered,
    active,
    clear,
  };
}
