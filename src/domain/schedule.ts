import type { Lesson, Schedule } from "./models";

/** Only fully recognized expressions participate in a no-overlap conclusion. */
function weekSet(expression: string): number[] | undefined {
  if (/\d\s+\d/.test(expression.replace(/周/g, ""))) return undefined;
  const normalized = expression
    .replace(/[()（）周\s]/g, "")
    .replace(/[~～—–至]/g, "-")
    .replace(/[，、]/g, ",");
  const result = new Set<number>();
  for (const part of normalized.split(",")) {
    const match = part.match(
      /^(?:第)?([单双])?(\d{1,2})(?:-(\d{1,2}))?([单双])?$/,
    );
    if (!match || (match[1] && match[4] && match[1] !== match[4]))
      return undefined;
    const start = Number(match[2]),
      end = Number(match[3] ?? match[2]),
      parity = match[1] ?? match[4];
    if (start < 1 || end > 53 || end < start) return undefined;
    for (let week = start; week <= end; week++) {
      if (!parity || (parity === "单" ? week % 2 === 1 : week % 2 === 0))
        result.add(week);
    }
  }
  return [...result].sort((a, b) => a - b);
}

export function parseWeeks(text: string): number[] | undefined {
  const exception = text.match(/^(.*?)(?:除|去掉)(.+)$/);
  if (!exception) return weekSet(text);
  const base = weekSet(exception[1]!.replace(/[,，、（(\s]+$/, ""));
  const excluded = weekSet(
    exception[2]!.replace(/[）)\s]+$/, "").replace(/外$/, ""),
  );
  if (!base || !excluded) return undefined;
  return base.filter((week) => !excluded.includes(week));
}

export function parseSchedule(text: string): Schedule {
  const slots: Schedule["slots"] = [];
  let unknown = !text.trim();
  for (const line of text.split(/[\n;；]/).filter((line) => line.trim())) {
    const match = line
      .trim()
      .match(/^(.+?)\s*[:：]\s*([1-7])\s*[（(]([\d,，、\s~～—–至-]+)[）)]/);
    if (!match) {
      unknown = true;
      continue;
    }
    const prefix = match[1]!;
    let split: { weeks: number[]; location: string } | undefined;
    for (const gap of prefix.matchAll(/\s+/g)) {
      const weekText = prefix.slice(0, gap.index);
      const location = prefix.slice(gap.index! + gap[0].length).trim();
      if (!weekText.includes("周") || !location) continue;
      const weeks = parseWeeks(weekText);
      if (weeks?.length) split = { weeks, location };
    }
    const periods = parseWeeks(match[3]!);
    if (!split || !periods?.length || periods.some((period) => period > 14)) {
      unknown = true;
      continue;
    }
    // Inspect the tail before deduplication so repeated lines cannot hide unknown segments.
    if (/[:：]\s*[1-7]\s*[（(]/.test(line.trim().slice(match[0].length)))
      unknown = true;
    const day = Number(match[2]);
    const existing = slots.find(
      (slot) =>
        slot.day === day &&
        slot.location === split.location &&
        slot.periods.join(",") === periods.join(","),
    );
    if (existing)
      existing.weeks = [...new Set([...existing.weeks, ...split.weeks])].sort(
        (a, b) => a - b,
      );
    else
      slots.push({
        day,
        periods,
        weeks: split.weeks,
        location: split.location,
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
