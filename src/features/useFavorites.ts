import { computed } from "vue";
import {
  workspace,
  editWorkspace,
  workspaceStorageError,
} from "./useWorkspace";
export function useFavorites() {
  return {
    favorites: computed(() => workspace.value.favorites),
    storageError: workspaceStorageError,
    toggle: (code: string) =>
      editWorkspace((next) => {
        if (next.favorites.includes(code))
          next.favorites = next.favorites.filter((c) => c !== code);
        else {
          if (next.favorites.length >= 1000)
            throw new Error("本机最多保存 1000 门收藏课程。");
          next.favorites.push(code);
        }
      }),
    clear: () =>
      editWorkspace((next) => {
        next.favorites = [];
      }),
  };
}
