import { shallowRef } from "vue";
import type { IcourseIndex } from "../domain/icourse";

const index = shallowRef<IcourseIndex>(),
  load = () => import("../data/icourseLinks");
let pending: Promise<void> | undefined;

export function useIcourseLinks() {
  pending ??= load()
    .then((module) => {
      index.value = module.icourseIndex;
    })
    .catch(() => {
      // Search remains available when the optional index cannot be loaded.
      index.value = {};
    });
  return index;
}
