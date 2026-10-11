import { computed } from "vue";
import type { Lesson } from "../domain/models";
import {
  createScheme,
  uniqueSchemeName,
  MAX_SCHEMES,
  MAX_CANDIDATES,
} from "../domain/workspace";
import {
  workspace,
  editWorkspace,
  workspaceStorageError,
} from "./useWorkspace";
export function usePlanner(semester: { value: string }) {
  const term = computed(() => workspace.value.semesters[semester.value]);
  const schemes = computed(() => term.value?.schemes ?? []);
  const active = computed(() =>
    schemes.value.find((s) => s.id === term.value?.activeId),
  );
  function edit(update: (scheme: NonNullable<typeof active.value>) => void) {
    if (!semester.value) return;
    editWorkspace((next) => {
      const id = semester.value;
      const stored =
        next.semesters[id] ??
        (() => {
          const scheme = createScheme();
          return { activeId: scheme.id, schemes: [scheme] };
        })();
      next.semesters[id] = stored;
      const scheme = stored.schemes.find((s) => s.id === stored.activeId)!;
      update(scheme);
      scheme.savedAt = new Date().toISOString();
    });
  }
  const lessons = computed(() => active.value?.lessons ?? []);
  function toggle(lesson: Lesson) {
    edit((s) => {
      if (s.lessons.some((l) => l.id === lesson.id))
        s.lessons = s.lessons.filter((l) => l.id !== lesson.id);
      else if (s.lessons.length < MAX_CANDIDATES) s.lessons.push(lesson);
      else throw new Error("每个方案最多保存 100 个候选教学班。");
    });
  }
  function addScheme(name: string, copy = false) {
    if (!semester.value) return;
    editWorkspace((next) => {
      const id = semester.value;
      const stored = next.semesters[id] ?? { activeId: "", schemes: [] };
      if (stored.schemes.length >= MAX_SCHEMES)
        throw new Error("每学期最多保存 20 个方案。");
      const source = copy
        ? stored.schemes.find((s) => s.id === stored.activeId)
        : undefined;
      const scheme = createScheme(
        uniqueSchemeName(name, stored.schemes),
        source?.lessons ?? [],
        source?.calendar,
      );
      stored.schemes.push(scheme);
      stored.activeId = scheme.id;
      next.semesters[id] = stored;
    });
  }
  const activeSchemeId = computed({
    get: () => term.value?.activeId ?? "",
    set: (id: string) => {
      editWorkspace((next) => {
        const term = next.semesters[semester.value];
        if (term?.schemes.some((s) => s.id === id)) term.activeId = id;
      });
    },
  });
  function removeScheme() {
    editWorkspace((next) => {
      const term = next.semesters[semester.value];
      if (!term) return;
      term.schemes = term.schemes.filter((s) => s.id !== term.activeId);
      if (!term.schemes.length) term.schemes = [createScheme()];
      term.activeId = term.schemes[0]!.id;
    });
  }
  function renameScheme(name: string) {
    edit((s) => {
      if (!name.trim()) throw new Error("请输入方案名称。");
      const others = schemes.value.filter((item) => item.id !== s.id);
      s.name = uniqueSchemeName(name, others);
    });
  }
  const firstMonday = computed({
    get: () => active.value?.calendar.firstMonday ?? "",
    set: (value: string) =>
      edit((s) => {
        s.calendar.firstMonday = value;
      }),
  });
  const layout = computed({
    get: () => active.value?.calendar.layout ?? "",
    set: (value: string) =>
      edit((s) => {
        if (!["", "1", "2"].includes(value)) return;
        s.calendar.layout = value as "" | "1" | "2";
      }),
  });
  return {
    lessons,
    schemes,
    activeSchemeId,
    active,
    addScheme,
    removeScheme,
    renameScheme,
    firstMonday,
    layout,
    toggle,
    refresh: (current: Lesson[]) =>
      edit((s) => {
        s.lessons = s.lessons.map(
          (l) => current.find((c) => c.id === l.id) ?? l,
        );
      }),
    clear: () =>
      edit((s) => {
        s.lessons = [];
      }),
    savedAt: computed(() => active.value?.savedAt),
    storageError: workspaceStorageError,
  };
}
export function clearPlanner() {
  editWorkspace((next) => {
    next.semesters = {};
  });
}
