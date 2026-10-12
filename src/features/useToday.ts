import { ref } from "vue";
import { todayISO } from "../domain/dates";
const today = ref(todayISO());
let started = false;
export function refreshToday() {
  today.value = todayISO();
}
export function useToday() {
  if (!started && typeof window !== "undefined") {
    started = true;
    window.setInterval(refreshToday, 30_000);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshToday();
    });
  }
  refreshToday();
  return today;
}
