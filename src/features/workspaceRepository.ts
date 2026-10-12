import {
  emptyWorkspace,
  workspaceSchema,
  type Workspace,
} from "../domain/workspace";
export class WorkspaceStorageError extends Error {}
export const WORKSPACE_DB = "ustc-catalog-workspace";
let database: Promise<IDBDatabase> | undefined;
async function open() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(WORKSPACE_DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspaces");
      request.onerror = () =>
        reject(new WorkspaceStorageError("无法打开本机规划存储"));
      request.onblocked = () =>
        reject(
          new WorkspaceStorageError("本机规划存储正在升级，请关闭旧标签页"),
        );
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
    } catch {
      reject(new WorkspaceStorageError("浏览器不支持本机规划存储"));
    }
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}
export async function readWorkspace(key: string) {
  const db = await open();
  return new Promise<Workspace | undefined>((resolve, reject) => {
    const request = db
      .transaction("workspaces")
      .objectStore("workspaces")
      .get(key);
    request.onerror = () =>
      reject(new WorkspaceStorageError("无法读取本机规划数据"));
    request.onsuccess = () => {
      try {
        resolve(
          request.result ? workspaceSchema.parse(request.result) : undefined,
        );
      } catch (error) {
        reject(error);
      }
    };
  });
}
/** Call the synchronous edit inside the read/write transaction against the latest value. */
export async function transactWorkspace(
  key: string,
  edit: (next: Workspace) => void,
  seed: () => Workspace = emptyWorkspace,
) {
  const db = await open();
  return new Promise<Workspace>((resolve, reject) => {
    const tx = db.transaction("workspaces", "readwrite"),
      store = tx.objectStore("workspaces"),
      request = store.get(key);
    let next: Workspace, failure: unknown;
    request.onsuccess = () => {
      try {
        next = workspaceSchema.parse(request.result ?? seed());
        const revision = next.revision;
        edit(next);
        next.revision = revision + 1;
        next = workspaceSchema.parse(next);
        store.put(next, key);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(next!);
    tx.onabort = tx.onerror = () =>
      reject(failure ?? new WorkspaceStorageError("无法保存本机规划数据"));
  });
}
export async function eraseWorkspaces() {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("workspaces", "readwrite");
    tx.objectStore("workspaces").clear();
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(new WorkspaceStorageError("无法清除本机规划数据"));
  });
}
