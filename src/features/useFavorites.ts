import { computed } from "vue";
import {
  workspace,
  editWorkspace,
  workspaceStorageError,
  workspaceReady,
} from "./useWorkspace";
export function useFavorites() {
  return {
    favorites: computed(() => workspace.value.favorites),
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
  };
}
