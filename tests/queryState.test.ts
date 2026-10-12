import { it, expect } from "vitest";
import { effectScope, ref, nextTick } from "vue";
import { useQuery } from "../src/features/useQuery";
import type { QueryResult } from "../src/domain/models";
const result = (value: string): QueryResult<string> => ({
  data: value,
  meta: {
    source: value,
    state: "online",
    retrievedAt: new Date().toISOString(),
  },
});
it("keeps a same-key refresh visible, isolates changed keys and ignores old completions", async () => {
  const scope = effectScope(),
    key = ref("A"),
    enabled = ref(true);
  const requests: {
    resolve: (value: QueryResult<string>) => void;
    reject: (cause: Error) => void;
  }[] = [];
  const query = scope.run(() =>
    useQuery(
      () =>
        new Promise<QueryResult<string>>((resolve, reject) =>
          requests.push({ resolve, reject }),
        ),
      key,
      enabled,
    ),
  )!;
  requests[0]!.resolve(result("A"));
  await nextTick();
  expect(query.resolved.value).toBe(true);
  const refresh = query.reload();
  expect(query.data.value).toBe("A");
  expect(query.loading.value).toBe(true);
  key.value = "B";
  await nextTick();
  expect(query.data.value).toBeUndefined();
  expect(query.resolved.value).toBe(false);
  requests[1]!.resolve(result("old A"));
  await refresh;
  expect(query.data.value).toBeUndefined();
  requests[2]!.resolve(result("B"));
  await nextTick();
  expect(query.data.value).toBe("B");
  const failed = query.reload();
  requests[3]!.reject(new Error("schema failure"));
  await failed;
  expect(query.data.value).toBeUndefined();
  expect(query.resolved.value).toBe(false);
  expect(query.error.value?.message).toBe("schema failure");
  enabled.value = false;
  await nextTick();
  expect(query.error.value).toBeUndefined();
  expect(query.loading.value).toBe(false);
  scope.stop();
});
