import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
export function useFilter(name: string, fallback = '') {
  const route = useRoute(), router = useRouter()
  return computed({ get: () => typeof route.query[name] === 'string' ? route.query[name] as string : fallback, set: value => { void router.replace({ query: { ...route.query, [name]: value && value !== fallback ? value : undefined, page: name === 'page' ? value : undefined } }) } })
}
export function useDebounced(source: Ref<string>, delay = 300) {
  const value = ref(source.value)
  let timer: ReturnType<typeof setTimeout>
  watch(source, next => { clearTimeout(timer); timer = setTimeout(() => { value.value = next }, delay) })
  onScopeDispose(() => clearTimeout(timer))
  return value
}
