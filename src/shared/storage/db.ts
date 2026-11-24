import { createStore, del, entries, get, set } from 'idb-keyval'

export const projectStore = createStore('marcoflow', 'projects')

export const db = {
  entries: <T>() => entries<string, T>(projectStore),
  get: <T>(key: string) => get<T>(key, projectStore),
  set: (key: string, value: unknown) => set(key, value, projectStore),
  del: (key: string) => del(key, projectStore),
}
