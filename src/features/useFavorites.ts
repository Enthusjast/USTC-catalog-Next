import { ref, watch } from "vue";
import { z } from "zod";
function read() {
  try {
    return z
      .array(z.string())
      .max(1000)
      .parse(JSON.parse(localStorage.getItem("catalog:favorites") ?? "[]"));
  } catch {
    return [];
  }
}
const favorites = ref(read()),
  storageError = ref("");
watch(
  favorites,
  (value) => {
    try {
      localStorage.setItem("catalog:favorites", JSON.stringify(value));
      storageError.value = "";
    } catch {
      storageError.value = "浏览器无法保存收藏，本次收藏仅保留到页面关闭。";
    }
  },
  { deep: true },
);
export function useFavorites() {
  return {
    favorites,
    storageError,
    toggle: (code: string) => {
      favorites.value = favorites.value.includes(code)
        ? favorites.value.filter((c) => c !== code)
        : [...favorites.value, code];
    },
    clear: () => {
      favorites.value = [];
    },
  };
}
