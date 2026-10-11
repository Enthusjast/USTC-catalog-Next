import { shallowRef } from "vue";
import { storageKey } from "./storageKey";
import {
  emptyWorkspace,
  workspaceSchema,
  migrateLegacy,
  makeBackup,
  parseBackup,
  mergeBackup,
  type Workspace,
} from "../domain/workspace";
const key = storageKey("workspace");
export const workspaceStorageError = shallowRef("");
let readable = true;
function read(): Workspace {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return workspaceSchema.parse(JSON.parse(saved));
    const planner = localStorage.getItem(storageKey("planner")),
      favorites = localStorage.getItem(storageKey("favorites"));
    const migrated = migrateLegacy(
      planner ? JSON.parse(planner) : {},
      favorites ? JSON.parse(favorites) : [],
    );
    if (planner || favorites) {
      try {
        localStorage.setItem(key, JSON.stringify(migrated));
        localStorage.removeItem(storageKey("planner"));
        localStorage.removeItem(storageKey("favorites"));
      } catch {
        workspaceStorageError.value =
          "旧清单已读取，但无法保存迁移结果；原存储已保留。";
      }
    }
    return migrated;
  } catch {
    readable = false;
    workspaceStorageError.value =
      "本机数据无法读取或迁移，原存储已保留。请先导出原浏览器数据或清除本机数据。";
    return emptyWorkspace();
  }
}
export const workspace = shallowRef<Workspace>(read());
export function saveWorkspace(value: Workspace, requirePersist = false) {
  const next = workspaceSchema.parse(value);
  if (!readable) {
    workspaceStorageError.value = "原存储无法读取，未覆盖原数据。";
    return false;
  }
  try {
    localStorage.setItem(key, JSON.stringify(next));
    workspace.value = next;
    workspaceStorageError.value = "";
    return true;
  } catch {
    if (!requirePersist) workspace.value = next;
    workspaceStorageError.value = requirePersist
      ? "备份无法保存，原数据未改变。"
      : "无法保存到浏览器，本次修改仅保留到页面关闭。";
    return false;
  }
}
export function editWorkspace(edit: (next: Workspace) => void) {
  try {
    const next = workspaceSchema.parse(workspace.value);
    edit(next);
    return saveWorkspace(next);
  } catch (error) {
    workspaceStorageError.value =
      error instanceof Error ? error.message : "无法修改方案";
    return false;
  }
}
export function exportWorkspace() {
  return JSON.stringify(makeBackup(workspace.value), null, 2);
}
export function previewWorkspaceImport(text: string) {
  const backup = parseBackup(text);
  mergeBackup(workspace.value, backup);
  return backup;
}
export function importWorkspace(text: string) {
  try {
    return saveWorkspace(mergeBackup(workspace.value, parseBackup(text)), true);
  } catch (error) {
    workspaceStorageError.value =
      error instanceof Error ? error.message : "导入失败";
    return false;
  }
}
export function clearWorkspace() {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(storageKey("planner"));
    localStorage.removeItem(storageKey("favorites"));
    readable = true;
    workspace.value = emptyWorkspace();
    workspaceStorageError.value = "";
  } catch {
    workspaceStorageError.value = "无法清除本机数据。";
    throw new Error(workspaceStorageError.value);
  }
}
