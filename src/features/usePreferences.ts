import { ref, watch } from 'vue'

function readTheme(): string | null { try { return localStorage.getItem('catalog:theme') } catch { return null } }
const theme = ref(readTheme() === 'dark' ? 'dark' : 'light')
watch(theme, value => {
  document.documentElement.dataset.theme = value
  try { localStorage.setItem('catalog:theme', value) } catch { /* Theme still works without storage. */ }
}, { immediate: true })
export function usePreferences() { return { theme, toggleTheme: () => { theme.value = theme.value === 'light' ? 'dark' : 'light' } } }
