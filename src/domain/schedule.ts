import type { Lesson, Schedule } from "./models";

/** Only fully recognized expressions participate in a no-overlap conclusion. */
export function parseWeeks(text: string): number[] | undefined {
  let value = text
    .trim()
    .replaceAll("，", ",")
    .replace(/[~～—–]/g, "-")
    .replace(/周/g, "");
  const odd = /单/.test(value),
    even = /双/.test(value);
  value = value.replace(/[()（）单双\s]/g, "");
  if (!value || (odd && even)) return undefined;
  const excluded: number[] = [];
  const exception = value.match(/^(.*?)(?:除|去掉)(.+?)(?:外)?$/);
  if (exception) {
    value = exception[1]!;
    const parsed = parseWeeks(exception[2]!.replace(/外$/, ""));
    if (!parsed) return undefined;
    excluded.push(...parsed);
  }
  const weeks: number[] = [];
  for (const part of value.split(",")) {
    const match = part.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
    if (!match) return undefined;
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end > 53 || end < start) return undefined;
    for (let week = start; week <= end; week++) {
      if (
        (!odd || week % 2 === 1) &&
        (!even || week % 2 === 0) &&
        !excluded.includes(week)
      )
        weeks.push(week);
    }
  }
  return [...new Set(weeks)].sort((a, b) => a - b);
}

export function parseSchedule(text: string): Schedule {
  const slots: Schedule["slots"] = [];
  let unknown = !text.trim();
  for (const line of text.split(/[\n;；]/).filter((line) => line.trim())) {
    const match = line
      .trim()
      .match(
        /^(.+?周(?:[（(][单双]周?[）)])?)\s+(.+?)\s*[:：]\s*([1-7])\s*\(([\d,，\s~-]+)\)/,
      );
    if (!match) {
      unknown = true;
      continue;
    }
    const weeks = parseWeeks(match[1]!),
      periods = parseWeeks(match[4]!);
    if (
      !weeks?.length ||
      !periods?.length ||
      periods.some((period) => period > 14)
    ) {
      unknown = true;
      continue;
    }
    slots.push({
      day: Number(match[3]),
      periods,
      weeks,
      location: match[2]!.trim(),
    });
  }
  return { slots, unknown, text };
}

export function lessonConflicts(lessons: Lesson[]) {
  const overlaps: { left: Lesson; right: Lesson; weeks: number[] }[] = [];
  for (let i = 0; i < lessons.length; i++)
    for (let j = i + 1; j < lessons.length; j++) {
      const left = lessons[i]!,
        right = lessons[j]!,
        weeks = new Set<number>();
      for (const a of left.schedule.slots)
        for (const b of right.schedule.slots) {
          if (
            a.day === b.day &&
            a.periods.some((period) => b.periods.includes(period))
          ) {
            a.weeks
              .filter((week) => b.weeks.includes(week))
              .forEach((week) => weeks.add(week));
          }
        }
      if (weeks.size)
        overlaps.push({ left, right, weeks: [...weeks].sort((a, b) => a - b) });
    }
  return {
    overlaps,
    unknown: lessons.filter((lesson) => lesson.schedule.unknown),
  };
}

export function clockMinutes(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value),
    match = text.includes(":")
      ? text.match(/^(\d{1,2}):(\d{2})$/)
      : text.padStart(4, "0").match(/^(\d{2})(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]),
    minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : undefined;
}
export function formatClock(minutes?: number) {
  return minutes === undefined
    ? "未提供"
    : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
