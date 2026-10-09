import { computed, ref, watch } from "vue";
import { z } from "zod";
import type { Lesson } from "../domain/models";

const savedLesson = z.object({
  id: z.string(),
  code: z.string(),
  course: z.object({
    code: z.string(),
    name: z.string(),
    englishName: z.string().optional(),
  }),
  department: z.string(),
  departmentCode: z.string(),
  teachers: z.array(z.string()),
  schedule: z.object({
    slots: z.array(
      z.object({
        day: z.number().int().min(1).max(7),
        periods: z.array(z.number().int().min(1).max(14)),
        weeks: z.array(z.number().int().min(1).max(53)),
        location: z.string(),
      }),
    ),
    unknown: z.boolean(),
    text: z.string(),
  }),
  credits: z.number().optional(),
  hours: z.number().optional(),
  count: z.number().optional(),
  capacity: z.number().optional(),
  education: z.string().optional(),
  classType: z.string().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  examMode: z.string().optional(),
  campus: z.string().optional(),
});
const savedSchema = z.record(
  z.string(),
  z.object({ lessons: z.array(savedLesson).max(100), savedAt: z.string() }),
);
function read() {
  try {
    return savedSchema.parse(
      JSON.parse(localStorage.getItem("catalog:planner") ?? "{}"),
    );
  } catch {
    return {};
  }
}
const plans =
    ref<Record<string, { lessons: Lesson[]; savedAt: string }>>(read()),
  storageError = ref("");
watch(
  plans,
  (value) => {
    try {
      localStorage.setItem("catalog:planner", JSON.stringify(value));
      storageError.value = "";
    } catch {
      storageError.value =
        "候选清单无法保存到浏览器，本次修改仅保留到页面关闭。";
    }
  },
  { deep: true },
);
export function usePlanner(semester: { value: string }) {
  const lessons = computed(() => plans.value[semester.value]?.lessons ?? []);
  function save(next: Lesson[]) {
    if (semester.value)
      plans.value[semester.value] = {
        lessons: next,
        savedAt: new Date().toISOString(),
      };
  }
  function toggle(lesson: Lesson) {
    if (lessons.value.some((l) => l.id === lesson.id))
      save(lessons.value.filter((l) => l.id !== lesson.id));
    else if (lessons.value.length < 100) save([...lessons.value, lesson]);
    else storageError.value = "每个学期最多保存 100 个候选教学班。";
  }
  function refresh(current: Lesson[]) {
    save(
      lessons.value.map((l) => current.find((item) => item.id === l.id) ?? l),
    );
  }
  return {
    lessons,
    toggle,
    refresh,
    clear: () => save([]),
    savedAt: computed(() => plans.value[semester.value]?.savedAt),
    storageError,
  };
}
export function clearPlanner() {
  plans.value = {};
}
