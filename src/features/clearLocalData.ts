import { nextTick } from "vue";
import { clearCache } from "../api/cache";
import { clearWorkspace } from "./useWorkspace";
import { clearFilterPreferences } from "./filterPreferences";
import { usePreferences } from "./usePreferences";
import { removeCatalogStorage } from "../domain/localData";

export async function clearAllLocalData() {
  await clearCache();
  await clearWorkspace();
  clearFilterPreferences();
  usePreferences().theme.value = "light";
  await nextTick();
  removeCatalogStorage(localStorage);
  removeCatalogStorage(sessionStorage);
}
