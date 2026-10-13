import { ref, watch } from "vue";
import { applyTheme } from "../app/theme";

function readTheme(): string | null {
  try {
    return localStorage.getItem("catalog:theme");
  } catch {
    return null;
  }
}
const savedTheme = readTheme();
const theme = ref<"dark" | "light">(
  savedTheme === "dark" ||
    (!savedTheme &&
      typeof matchMedia === "function" &&
      matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light",
);
watch(
  theme,
  (value) => {
    applyTheme(value);
    try {
      localStorage.setItem("catalog:theme", value);
    } catch {
      /* Theme still works without storage. */
    }
  },
  { immediate: true },
);
export function usePreferences() {
  return {
    theme,
    toggleTheme: () => {
      theme.value = theme.value === "light" ? "dark" : "light";
    },
  };
}
