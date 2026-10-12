import { computed } from "vue";
import type { z } from "zod";
import type { favoriteDetailSchema } from "../domain/workspace";
type Detail = z.infer<typeof favoriteDetailSchema>;
function groupName(name: string) {
  const value = name.trim();
  if (!value || value.length > 40 || value === "未分组")
    throw new Error("请输入 1–40 字的分组名，避开“未分组”。");
  return value;
}
import {
  workspace,
  editWorkspace,
  workspaceStorageError,
  workspaceReady,
} from "./useWorkspace";
export function useFavorites() {
  return {
    favorites: computed(() => workspace.value.favorites),
    groups: computed(() => workspace.value.favoriteGroups),
    details: computed(() => workspace.value.favoriteDetails),
    storageError: workspaceStorageError,
    toggle: async (code: string) => {
      await workspaceReady;
      const desired = !workspace.value.favorites.includes(code);
      return editWorkspace((next) => {
        if (!desired) {
          next.favorites = next.favorites.filter((c) => c !== code);
          delete next.favoriteDetails[code];
        } else if (!next.favorites.includes(code)) {
          if (next.favorites.length >= 1000)
            throw new Error("本机最多保存 1000 门收藏课程。");
          next.favorites.push(code);
        }
      });
    },
    clear: () =>
      editWorkspace((next) => {
        next.favorites = [];
        next.favoriteDetails = {};
      }),
    createGroup: (name: string) =>
      editWorkspace((next) => {
        const value = groupName(name);
        if (next.favoriteGroups.some((g) => g.name === value))
          throw new Error("已有同名分组。");
        if (next.favoriteGroups.length >= 20)
          throw new Error("最多 20 个收藏分组。");
        next.favoriteGroups.push({ id: crypto.randomUUID(), name: value });
      }),
    renameGroup: (id: string, name: string, expected: string) =>
      editWorkspace((next) => {
        const group = next.favoriteGroups.find((g) => g.id === id);
        if (!group || group.name !== expected)
          throw new Error("分组已变化，请重新打开编辑。");
        const value = groupName(name);
        if (next.favoriteGroups.some((g) => g.id !== id && g.name === value))
          throw new Error("已有同名分组。");
        group.name = value;
      }),
    removeGroup: (id: string) =>
      editWorkspace((next) => {
        next.favoriteGroups = next.favoriteGroups.filter((g) => g.id !== id);
        for (const detail of Object.values(next.favoriteDetails))
          if (detail.groupId === id) detail.groupId = undefined;
      }),
    saveDetails: (code: string, detail: Detail, expected: Detail) =>
      editWorkspace((next) => {
        if (!next.favorites.includes(code))
          throw new Error("课程已取消收藏，请重新打开。");
        const latest = next.favoriteDetails[code] ?? { note: "" };
        if (
          latest.note !== expected.note ||
          (latest.groupId ?? "") !== (expected.groupId ?? "")
        )
          throw new Error(
            "备注或分组已被另一页修改，草稿已保留，请重新打开编辑。",
          );
        next.favoriteDetails[code] = {
          note: detail.note,
          groupId: detail.groupId || undefined,
        };
      }),
  };
}
