import { ref, watch } from "vue";
import { z } from "zod";
import { storageKey } from "./storageKey";
const key = storageKey("favorites");
function read() {
  try {
    return z
      .array(z.string())
      .max(1000)
      .parse(JSON.parse(localStorage.getItem(key) ?? "[]"));
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
      localStorage.setItem(key, JSON.stringify(value));
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
      if (!favorites.value.includes(code) && favorites.value.length >= 1000) {
        storageError.value = "本机最多保存 1000 门收藏课程。";
        return;
      }
      favorites.value = favorites.value.includes(code)
        ? favorites.value.filter((c) => c !== code)
        : [...favorites.value, code];
    },
    clear: () => {
      favorites.value = [];
    },
  };
}
