import { computed, ref, type Ref } from "vue";
import type { Lesson } from "../domain/models";
import { useFilter } from "./useFilters";
export function useLessonComparison(data: Ref<Lesson[] | undefined>) {
  const compare = useFilter("compare");
  const compareCodes = computed(() =>
    [...new Set(compare.value.split(",").filter(Boolean))].slice(0, 4),
  );
  const compared = computed(() => {
    const selected = compareCodes.value.flatMap((code) => {
      const lesson = data.value?.find((l) => l.code === code);
      return lesson ? [lesson] : [];
    });
    return selected.filter((l) => l.course.code === selected[0]?.course.code);
  });
  const compareMessage = ref("");
  function toggleCompare(lesson: Lesson) {
    if (compareCodes.value.includes(lesson.code)) {
      compare.value = compareCodes.value
        .filter((code) => code !== lesson.code)
        .join(",");
      return;
    }
    if (
      compared.value.length &&
      compared.value[0]!.course.code !== lesson.course.code
    ) {
      compareMessage.value = "只能对比同一课程的教学班。";
      return;
    }
    if (compareCodes.value.length >= 4) {
      compareMessage.value = "最多对比四个教学班。";
      return;
    }
    compareMessage.value = "";
    compare.value = [...compareCodes.value, lesson.code].join(",");
  }
  return { compare, compareCodes, compared, compareMessage, toggleCompare };
}
