import { toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { catalog } from "../api/catalog";
import { API_BASE } from "../api/client";
import type { Lesson, LessonFilterInfo, QueryResult } from "../domain/models";
import { abortIfNeeded, mapConcurrent } from "../domain/concurrency";
import { useQuery } from "./useQuery";

export function useLessonFilterInfo(
  semester: Ref<string>,
  lessons: Ref<Lesson[] | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<LessonFilterInfo[]>(
    async (signal, force): Promise<QueryResult<LessonFilterInfo[]>> => {
      abortIfNeeded(signal);
      const selectedSemester = semester.value;
      const codes = [
        ...new Set((lessons.value ?? []).map((l) => l.code)),
      ].sort();
      const batches = Array.from(
        { length: Math.ceil(codes.length / 100) },
        (_, i) => codes.slice(i * 100, (i + 1) * 100),
      );
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      try {
        const results = await mapConcurrent(
          batches,
          (batch) =>
            catalog.lessonFilterInfo(batch, selectedSemester, {
              signal: controller.signal,
              force,
            }),
          controller.signal,
          3,
        );
        const sources = results.map((result) => result.meta);
        return {
          data: results.flatMap((result) => result.data),
          meta: {
            source: `${API_BASE}/teach/lesson/infos`,
            retrievedAt:
              sources.map((source) => source.retrievedAt).sort()[0] ??
              new Date().toISOString(),
            state: sources.some((source) => source.state === "stale")
              ? "stale"
              : sources.some((source) => source.state === "cache")
                ? "cache"
                : "online",
            kind: sources.every((source) => source.kind === "demo")
              ? "demo"
              : undefined,
            sources,
          },
        };
      } catch (error) {
        controller.abort();
        throw error;
      } finally {
        signal.removeEventListener("abort", abort);
      }
    },
    () => [semester.value, lessons.value],
    () => !!semester.value && !!lessons.value?.length && toValue(enabled),
  );
}
