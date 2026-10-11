import { toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { catalog } from "../api/catalog";
import { API_BASE, TTL } from "../api/client";
import type {
  Lesson,
  LessonFilterInfo,
  QueryMeta,
  QueryResult,
} from "../domain/models";
import { abortIfNeeded, mapConcurrent } from "../domain/concurrency";
import { useQuery } from "./useQuery";
export function useLessonFilterInfo(
  semester: Ref<string>,
  lessons: MaybeRefOrGetter<Lesson[] | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const known = new Map<string, { info: LessonFilterInfo; meta: QueryMeta }>();
  const codes = () =>
    [...new Set((toValue(lessons) ?? []).map((l) => l.code))].sort();
  return useQuery<LessonFilterInfo[]>(
    async (signal, force): Promise<QueryResult<LessonFilterInfo[]>> => {
      const term = semester.value,
        wanted = codes();
      const missing = wanted.filter((code) => {
        const entry = known.get(`${term}:${code}`);
        return (
          force ||
          !entry ||
          (Date.now() - Date.parse(entry.meta.retrievedAt) > TTL.schedule &&
            navigator.onLine)
        );
      });
      const batches = Array.from(
        { length: Math.ceil(missing.length / 100) },
        (_, i) => missing.slice(i * 100, (i + 1) * 100),
      );
      const controller = new AbortController(),
        abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      try {
        const results = await mapConcurrent(
          batches,
          (batch) =>
            catalog.lessonFilterInfo(batch, term, {
              signal: controller.signal,
              force,
            }),
          controller.signal,
          3,
        );
        abortIfNeeded(signal);
        results.forEach((result) =>
          result.data.forEach((info) =>
            known.set(`${term}:${info.code}`, { info, meta: result.meta }),
          ),
        );
        const entries = wanted.map((code) => known.get(`${term}:${code}`));
        if (entries.some((entry) => !entry))
          throw new Error("部分教学班的筛选信息未返回，请缩小查询范围或重试。");
        const sources = entries.map((entry) => entry!.meta);
        return {
          data: entries.map((entry) => entry!.info),
          meta: {
            source: `${API_BASE}/teach/lesson/infos`,
            retrievedAt:
              sources.map((s) => s.retrievedAt).sort()[0] ??
              new Date().toISOString(),
            state: sources.some((s) => s.state === "stale")
              ? "stale"
              : sources.some((s) => s.state === "cache")
                ? "cache"
                : "online",
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
    () => `${semester.value}:${codes().join(",")}`,
    () => !!semester.value && !!codes().length && toValue(enabled),
  );
}
