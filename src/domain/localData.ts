/** Remove both current and legacy application keys without affecting unrelated storage. */
export function removeCatalogStorage(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  );
  for (const key of keys)
    if (key?.startsWith("catalog:")) storage.removeItem(key);
}
