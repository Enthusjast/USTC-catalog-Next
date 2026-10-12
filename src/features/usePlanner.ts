import { computed } from "vue";
import type { Lesson } from "../domain/models";
import {
  createScheme,
  uniqueSchemeName,
  MAX_SCHEMES,
  MAX_CANDIDATES,
  type CandidateScheme,
} from "../domain/workspace";
import {
  workspace,
  editWorkspace,
  workspaceStorageError,
  workspaceReady,
} from "./useWorkspace";
export function usePlanner(semester: { value: string }) {
  const term = computed(() => workspace.value.semesters[semester.value]);
  const schemes = computed(() => term.value?.schemes ?? []);
  const active = computed(() =>
    schemes.value.find((s) => s.id === term.value?.activeId),
  );
  const lessons = computed(() => active.value?.lessons ?? []);
  async function edit(update: (scheme: CandidateScheme) => void) {
    await workspaceReady;
    const termId = semester.value,
      schemeId = active.value?.id;
    if (!termId) return false;
    return editWorkspace((next) => {
      let stored = next.semesters[termId];
      if (!stored) {
        if (schemeId) throw new Error("方案已被删除，请重新选择。");
        const scheme = createScheme();
        stored = { activeId: scheme.id, schemes: [scheme] };
        next.semesters[termId] = stored;
      }
      const scheme = stored.schemes.find(
        (s) => s.id === (schemeId ?? stored.activeId),
      );
      if (!scheme) throw new Error("方案已被删除，请重新选择。");
      update(scheme);
      scheme.savedAt = new Date().toISOString();
    });
  }
  async function toggle(lesson: Lesson) {
    await workspaceReady;
    const desired = !lessons.value.some((l) => l.id === lesson.id);
    return edit((s) => {
      if (!desired) s.lessons = s.lessons.filter((l) => l.id !== lesson.id);
      else if (!s.lessons.some((l) => l.id === lesson.id)) {
        if (s.lessons.length >= MAX_CANDIDATES)
          throw new Error("每个方案最多保存 100 个候选教学班。");
        s.lessons.push(lesson);
      }
    });
  }
  async function addScheme(
    name: string,
    copy = false,
    expected?: CandidateScheme,
  ) {
    await workspaceReady;
    const termId = semester.value,
      source = expected ?? active.value;
    if (!termId) return false;
    return editWorkspace((next) => {
      const stored = next.semesters[termId] ?? { activeId: "", schemes: [] };
      if (stored.schemes.length >= MAX_SCHEMES)
        throw new Error("每学期最多保存 20 个方案。");
      const latest = copy
        ? stored.schemes.find((s) => s.id === source?.id)
        : undefined;
      if (
        copy &&
        (!latest || JSON.stringify(latest) !== JSON.stringify(source))
      )
        throw new Error("原方案已变化，请重新打开复制。");
      const scheme = createScheme(
        uniqueSchemeName(name, stored.schemes),
        latest?.lessons ?? [],
        latest?.calendar,
      );
      stored.schemes.push(scheme);
      stored.activeId = scheme.id;
      next.semesters[termId] = stored;
    });
  }
  async function selectScheme(id: string) {
    await workspaceReady;
    const termId = semester.value;
    return editWorkspace((next) => {
      const stored = next.semesters[termId];
      if (!stored?.schemes.some((s) => s.id === id))
        throw new Error("方案已被删除，请重新选择。");
      stored.activeId = id;
    });
  }
  const activeSchemeId = computed({
    get: () => term.value?.activeId ?? "",
    set: (id) => {
      void selectScheme(id);
    },
  });
  async function removeScheme(id = active.value?.id) {
    await workspaceReady;
    const termId = semester.value;
    return editWorkspace((next) => {
      const stored = next.semesters[termId];
      if (!stored?.schemes.some((s) => s.id === id))
        throw new Error("方案已被删除。");
      stored.schemes = stored.schemes.filter((s) => s.id !== id);
      if (!stored.schemes.length) stored.schemes = [createScheme()];
      if (stored.activeId === id) stored.activeId = stored.schemes[0]!.id;
    });
  }
  async function renameScheme(name: string, expected = active.value) {
    await workspaceReady;
    const termId = semester.value;
    return editWorkspace((next) => {
      const stored = next.semesters[termId],
        latest = stored?.schemes.find((s) => s.id === expected?.id);
      if (!stored || !latest || latest.name !== expected?.name)
        throw new Error("方案已变化，请重新打开重命名。");
      if (!name.trim()) throw new Error("请输入方案名称。");
      latest.name = uniqueSchemeName(
        name,
        stored.schemes.filter((s) => s.id !== latest.id),
      );
      latest.savedAt = new Date().toISOString();
    });
  }
  const firstMonday = computed({
    get: () => active.value?.calendar.firstMonday ?? "",
    set: (value) => {
      void edit((s) => {
        s.calendar.firstMonday = value;
      });
    },
  });
  const layout = computed({
    get: () => active.value?.calendar.layout ?? "",
    set: (value) => {
      void edit((s) => {
        if (!["", "1", "2"].includes(value)) throw new Error("课节表无效。");
        s.calendar.layout = value as "" | "1" | "2";
      });
    },
  });
  return {
    lessons,
    schemes,
    active,
    activeSchemeId,
    selectScheme,
    addScheme,
    removeScheme,
    renameScheme,
    firstMonday,
    layout,
    toggle,
    edit,
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
export const clearPlanner = () =>
  editWorkspace((next) => {
    next.semesters = {};
  });
