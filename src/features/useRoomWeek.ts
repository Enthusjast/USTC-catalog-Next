import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import { catalog } from "../api/catalog";
import { useQuery } from "./useQuery";
import { mapConcurrent, abortIfNeeded } from "../domain/concurrency";
import { weekDates } from "../domain/dates";
import {
  roomAvailability,
  roomKey,
  type RoomSummary,
} from "../domain/roomAvailability";
import { roomDirectory } from "../domain/roomDirectory";
import { classroomDay } from "../domain/roomTimeline";
import type { QueryMeta } from "../domain/models";
export interface RoomWeekDay {
  date: string;
  room: RoomSummary;
  status: "loaded" | "error";
  meta?: QueryMeta;
}
export function useRoomWeek(
  date: MaybeRefOrGetter<string>,
  entry: MaybeRefOrGetter<RoomSummary>,
) {
  return useQuery<RoomWeekDay[]>(
    async (signal, force) => {
      const selected = toValue(entry),
        key = roomKey(selected),
        days = weekDates(toValue(date));
      const data = await mapConcurrent(
        days,
        async (day) => {
          try {
            const result = await catalog.rooms(day, { signal, force });
            const matched = roomAvailability(
              result.data,
              classroomDay.from,
              classroomDay.to,
              roomDirectory,
            ).find((room) => roomKey(room) === key);
            return {
              date: day,
              room: matched ?? {
                ...selected,
                records: [],
                state: "unknown" as const,
              },
              status: "loaded" as const,
              meta: result.meta,
            };
          } catch {
            abortIfNeeded(signal);
            return {
              date: day,
              room: { ...selected, records: [], state: "unknown" as const },
              status: "error" as const,
            };
          }
        },
        signal,
        3,
      );
      const sources = data.flatMap((day) => (day.meta ? [day.meta] : []));
      return {
        data,
        meta: {
          source: "classroom-week",
          retrievedAt:
            sources.map((s) => s.retrievedAt).sort()[0] ??
            new Date().toISOString(),
          state: sources.some((s) => s.state === "stale")
            ? ("stale" as const)
            : sources.some((s) => s.state === "cache")
              ? ("cache" as const)
              : ("online" as const),
          sources,
        },
      };
    },
    () => `${weekDates(toValue(date)).join(",")}:${roomKey(toValue(entry))}`,
    () => weekDates(toValue(date)).length === 7,
  );
}
