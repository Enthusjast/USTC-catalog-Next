import { ref } from "vue";
import { z } from "zod";
import type { LocationQuery, LocationQueryRaw } from "vue-router";
import { storageKey as key } from "./storageKey";

const storageKey = key("filters");
const fields: Record<string, string[]> = {
  "/courses": ["q", "dept", "mode", "category", "history", "saved"],
  "/programs": ["q", "dept", "type", "grade"],
  "/lessons": [
    "q",
    "dept",
    "teacher",
    "day",
    "period",
    "location",
    "education",
    "type",
    "category",
    "language",
    "exam",
    "view",
    "week",
    "semester",
  ],
  "/exams": [
    "kind",
    "q",
    "date",
    "dept",
    "room",
    "view",
    "saved",
    "week",
    "semester",
  ],
  "/classrooms": [
    "date",
    "from",
    "to",
    "building",
    "room",
    "type",
    "state",
    "capacity",
    "campus",
  ],
  "/substitutions": ["q", "side"],
  "/archives": ["q", "type", "department"],
};
const schema = z.record(z.string(), z.record(z.string(), z.string().max(500)));
function read(): Record<string, Record<string, string>> {
  try {
    return schema.parse(JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
  } catch {
    return {};
  }
}
const preferences = ref(read());
export const filterStorageError = ref("");
export function restoredFilters(path: string): LocationQueryRaw | undefined {
  const saved = preferences.value[path];
  if (!fields[path] || !saved) return undefined;
  const query = Object.fromEntries(
    Object.entries(saved).filter(([key]) => fields[path]!.includes(key)),
  );
  return Object.keys(query).length ? query : undefined;
}
export function saveFilters(path: string, query: LocationQuery) {
  if (!fields[path]) return;
  preferences.value[path] = Object.fromEntries(
    fields[path]!.flatMap((key) =>
      typeof query[key] === "string" && query[key] ? [[key, query[key]]] : [],
    ),
  );
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences.value));
    filterStorageError.value = "";
  } catch {
    filterStorageError.value =
      "浏览器无法保存筛选偏好，当前条件仍保留在分享链接中。";
  }
}
export function clearFilterPreferences() {
  preferences.value = {};
  try {
    localStorage.removeItem(storageKey);
    filterStorageError.value = "";
  } catch {
    filterStorageError.value =
      "筛选偏好无法从本机存储移除，请在浏览器设置中清除站点数据。";
  }
}
