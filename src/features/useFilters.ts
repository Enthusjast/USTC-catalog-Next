import {
  computed,
  onScopeDispose,
  ref,
  watch,
  toValue,
  type Ref,
  type MaybeRefOrGetter,
} from "vue";
import {
  useRoute,
  useRouter,
  type LocationQueryRaw,
  type Router,
} from "vue-router";
const pending = new WeakMap<Router, LocationQueryRaw>();
export function useFilter(
  name: string,
  fallback: MaybeRefOrGetter<string> = "",
) {
  const route = useRoute(),
    router = useRouter();
  return computed({
    get: () =>
      typeof route.query[name] === "string"
        ? (route.query[name] as string)
        : toValue(fallback),
    set: (value) => {
      const first = !pending.has(router);
      pending.set(router, {
        ...(pending.get(router) ?? route.query),
        [name]: value && value !== toValue(fallback) ? value : undefined,
        page: name === "page" ? value : undefined,
      });
      if (first)
        queueMicrotask(() => {
          const query = pending.get(router);
          pending.delete(router);
          void router.replace({ query });
        });
    },
  });
}
export function useDebounced(source: Ref<string>, delay = 300) {
  const value = ref(source.value);
  let timer: ReturnType<typeof setTimeout>;
  watch(source, (next) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      value.value = next;
    }, delay);
  });
  onScopeDispose(() => clearTimeout(timer));
  return value;
}
