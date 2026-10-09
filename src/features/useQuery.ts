import {
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import type { QueryMeta, QueryResult } from "../domain/models";
import { ApiError } from "../api/client";

export function useQuery<T>(
  loader: (signal: AbortSignal, force: boolean) => Promise<QueryResult<T>>,
  key: MaybeRefOrGetter<unknown> = "initial",
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const data = shallowRef<T>(),
    meta = ref<QueryMeta>(),
    loading = ref(false),
    error = shallowRef<Error>();
  let controller: AbortController | undefined,
    generation = 0;
  async function load(force = false) {
    const current = ++generation;
    controller?.abort();
    controller = new AbortController();
    data.value = undefined;
    meta.value = undefined;
    error.value = undefined;
    if (!toValue(enabled)) {
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const result = await loader(controller.signal, force);
      if (current === generation) {
        data.value = result.data;
        meta.value = result.meta;
      }
    } catch (cause) {
      if (
        current === generation &&
        !(cause instanceof DOMException && cause.name === "AbortError")
      )
        error.value =
          cause instanceof Error
            ? cause
            : new ApiError("network", "查询失败，请重试。", "");
    } finally {
      if (current === generation) loading.value = false;
    }
  }
  watch([() => toValue(key), () => toValue(enabled)], () => void load(), {
    immediate: true,
  });
  onScopeDispose(() => {
    generation++;
    controller?.abort();
  });
  return { data, meta, loading, error, reload: () => load(true) };
}
