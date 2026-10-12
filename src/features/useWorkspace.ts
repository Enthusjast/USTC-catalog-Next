import { shallowRef, ref, computed } from "vue";
import { storageKey } from "./storageKey";
import {
  emptyWorkspace,
  workspaceSchema,
  upgradeWorkspace,
  migrateLegacy,
  makeBackup,
  serializeBackup,
  parseBackup,
  mergeBackup,
  type Workspace,
} from "../domain/workspace";
import {
  readWorkspace,
  transactWorkspace,
  eraseWorkspaces,
  WorkspaceStorageError,
} from "./workspaceRepository";
const key = storageKey("workspace");
export const workspaceStorageError = shallowRef("");
export const workspace = shallowRef<Workspace>(emptyWorkspace());
export const workspaceLoaded = ref(false);
const writes = ref(0);
export const workspaceBusy = computed(
  () => !workspaceLoaded.value || writes.value > 0,
);
const legacyValues = new Map<string, string | null>();
let readable = true,
  ephemeral = false,
  epoch = 0;
let channel: BroadcastChannel | undefined;
const changeEvent = "ustc-workspace-changed";
function legacy() {
  for (const name of ["workspace", "planner", "favorites"])
    legacyValues.set(storageKey(name), localStorage.getItem(storageKey(name)));
  const saved = localStorage.getItem(key),
    planner = localStorage.getItem(storageKey("planner")),
    favorites = localStorage.getItem(storageKey("favorites"));
  return saved
    ? upgradeWorkspace(JSON.parse(saved))
    : migrateLegacy(
        planner ? JSON.parse(planner) : {},
        favorites ? JSON.parse(favorites) : [],
      );
}
function cleanLegacy(force = false) {
  for (const name of ["workspace", "planner", "favorites"])
    if (
      force ||
      localStorage.getItem(storageKey(name)) ===
        legacyValues.get(storageKey(name))
    )
      localStorage.removeItem(storageKey(name));
}
function announce(clear = false) {
  channel?.postMessage({ key, clear });
  try {
    localStorage.setItem(
      storageKey("workspace-signal"),
      `${Date.now()}:${crypto.randomUUID()}:${clear}`,
    );
  } catch {
    /* Broadcast remains optional. */
  }
}
async function refresh() {
  if (ephemeral || !workspaceLoaded.value) return;
  const generation = epoch;
  try {
    const latest = (await readWorkspace(key)) ?? emptyWorkspace();
    if (
      generation === epoch &&
      JSON.stringify(latest) !== JSON.stringify(workspace.value)
    ) {
      workspace.value = latest;
      workspaceStorageError.value = "";
    }
  } catch {
    /* Keep the readable in-memory copy. */
  }
}
export const workspaceReady = (async () => {
  let seed = emptyWorkspace();
  try {
    const current = await readWorkspace(key);
    if (current) workspace.value = current;
    else {
      try {
        seed = legacy();
      } catch (error) {
        if (
          !(error instanceof SyntaxError) &&
          (error as Error).name !== "ZodError"
        )
          throw new WorkspaceStorageError("无法读取旧存储");
        readable = false;
        throw new Error("旧规划数据无法读取，原存储已保留。");
      }
      workspace.value = await transactWorkspace(
        key,
        () => {},
        () => seed,
      );
      try {
        cleanLegacy();
      } catch {
        workspaceStorageError.value = "迁移已保存，旧键暂时无法移除。";
      }
    }
  } catch (error) {
    if (error instanceof WorkspaceStorageError) {
      ephemeral = true;
      try {
        seed = legacy();
        workspace.value = seed;
      } catch (error) {
        readable =
          !(error instanceof SyntaxError) &&
          (error as Error).name !== "ZodError";
      }
      workspaceStorageError.value =
        "无法保存到浏览器，原数据已保留；本次规划仅保留到页面关闭。";
    } else {
      readable = false;
      workspaceStorageError.value = (error as Error).message;
    }
  } finally {
    workspaceLoaded.value = true;
  }
})();
if (typeof window !== "undefined") {
  try {
    channel = new BroadcastChannel("ustc-catalog-workspaces");
    channel.onmessage = (event) => {
      if (event.data?.key === key || event.data?.clear) {
        epoch++;
        void refresh();
      }
    };
  } catch {
    /* Use the storage event fallback. */
  }
  window.addEventListener("storage", (event) => {
    if (event.key?.endsWith("workspace-signal")) {
      epoch++;
      void refresh();
    }
  });
  window.addEventListener("focus", () => void refresh());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refresh();
  });
  window.addEventListener(changeEvent, () => void refresh());
}
export async function editWorkspace(
  edit: (next: Workspace) => void,
  requirePersist = false,
) {
  await workspaceReady;
  if (!readable) {
    workspaceStorageError.value = "原数据无法读取，未覆盖原数据。";
    return false;
  }
  epoch++;
  writes.value++;
  try {
    if (ephemeral) {
      if (requirePersist) throw new Error("备份无法保存，原数据未改变。");
      const next = workspaceSchema.parse(workspace.value);
      edit(next);
      next.revision++;
      workspace.value = workspaceSchema.parse(next);
      return true;
    }
    workspace.value = await transactWorkspace(key, edit);
    workspaceStorageError.value = "";
    announce();
    return true;
  } catch (error) {
    if (error instanceof WorkspaceStorageError && !requirePersist) {
      const next = workspaceSchema.parse(workspace.value);
      try {
        edit(next);
        next.revision++;
        workspace.value = workspaceSchema.parse(next);
        ephemeral = true;
      } catch {
        /* Failed validation must not alter state. */
      }
      workspaceStorageError.value =
        "无法保存到浏览器，本次修改仅保留到页面关闭。";
    } else
      workspaceStorageError.value =
        error instanceof Error ? error.message : "无法修改方案";
    return false;
  } finally {
    writes.value--;
  }
}
export async function saveWorkspace(value: Workspace, requirePersist = false) {
  const expected = value.revision;
  return editWorkspace((next) => {
    if (next.revision !== expected)
      throw new Error("本机数据已变化，请重新打开编辑。");
    Object.assign(next, workspaceSchema.parse(value));
  }, requirePersist);
}
export function exportWorkspace() {
  return serializeBackup(makeBackup(workspace.value));
}
export function previewWorkspaceImport(text: string) {
  const backup = parseBackup(text);
  mergeBackup(workspace.value, backup);
  return backup;
}
export async function importWorkspace(text: string) {
  try {
    const backup = parseBackup(text);
    return await editWorkspace(
      (next) => Object.assign(next, mergeBackup(next, backup)),
      true,
    );
  } catch (error) {
    workspaceStorageError.value = (error as Error).message;
    return false;
  }
}
export async function clearWorkspace() {
  await workspaceReady;
  epoch++;
  await eraseWorkspaces();
  cleanLegacy(true);
  readable = true;
  ephemeral = false;
  workspace.value = emptyWorkspace();
  workspaceStorageError.value = "";
  announce(true);
}
