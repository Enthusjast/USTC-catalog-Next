import { shallowRef, watch } from "vue";
import type { Workspace } from "../domain/workspace";
import { workspace, editWorkspace } from "./useWorkspace";
interface Undo {
  label: string;
  revision: number;
  expires: number;
  restore: (next: Workspace) => void;
}
const last = shallowRef<Undo>();
let timer: ReturnType<typeof setTimeout>;
export function rememberWorkspaceUndo(label: string, restore: Undo["restore"]) {
  clearTimeout(timer);
  last.value = {
    label,
    restore,
    revision: workspace.value.revision,
    expires: Date.now() + 15_000,
  };
  timer = setTimeout(() => {
    last.value = undefined;
  }, 15_000);
}
watch(
  () => workspace.value.revision,
  (revision) => {
    if (last.value && last.value.revision !== revision) {
      clearTimeout(timer);
      last.value = undefined;
    }
  },
  { flush: "sync" },
);
async function undo() {
  const entry = last.value;
  last.value = undefined;
  clearTimeout(timer);
  if (!entry || entry.expires <= Date.now()) return false;
  return editWorkspace((next) => {
    if (next.revision !== entry.revision)
      throw new Error("规划已变化，撤销未执行。");
    entry.restore(next);
  });
}
export const useWorkspaceUndo = () => ({ last, undo });
