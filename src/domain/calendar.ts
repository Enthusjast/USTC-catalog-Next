import type { Exam, Lesson } from "./models";
import { periodTimes } from "./periods";
import { isISODate } from "./dates";

const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
const stamp = () =>
  new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
function fold(line: string) {
  const encoder = new TextEncoder();
  let current = "",
    bytes = 0;
  const lines: string[] = [];
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += character;
    bytes += length;
  }
  return [...lines, current].join("\r\n");
}
function calendar(events: string[][]) {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//USTC Catalog Explorer//Public Planner//ZH",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events.flat(),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
function dateOffset(date: string, offset: number) {
  const parsed = new Date(`${date}T00:00:00+08:00`);
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })
    .replaceAll("-", "");
}
function utcDate(date: string, minutes: number) {
  return new Date(
    `${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+08:00`,
  )
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "");
}
/** Period times are absent from the lesson endpoint: export honest all-day reminders. */
export function lessonCalendar(
  lessons: Lesson[],
  firstMonday: string,
  layout = "",
) {
  if (
    !isISODate(firstMonday) ||
    new Date(`${firstMonday}T12:00:00+08:00`).getUTCDay() !== 1
  )
    throw new Error("请填写第 1 教学周的周一日期。");
  const events: string[][] = [],
    skipped: string[] = [];
  for (const lesson of lessons) {
    if (lesson.schedule.unknown) {
      skipped.push(lesson.code);
      continue;
    }
    for (const [index, slot] of lesson.schedule.slots.entries()) {
      const groups: number[][] = [];
      [...slot.periods]
        .sort((a, b) => a - b)
        .forEach((period) => {
          const previous = groups[groups.length - 1];
          if (previous && previous[previous.length - 1] === period - 1)
            previous.push(period);
          else groups.push([period]);
        });
      for (const [groupIndex, periods] of groups.entries())
        for (const week of slot.weeks) {
          const offset = (week - 1) * 7 + slot.day - 1;
          const times = layout ? periodTimes(layout, periods) : undefined;
          if (layout && !times) {
            skipped.push(`${lesson.code} 第${week}周`);
            continue;
          }
          const date = dateOffset(firstMonday, offset),
            isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
          const dt = times
            ? [
                `DTSTART:${utcDate(isoDate, times.start)}`,
                `DTEND:${utcDate(isoDate, times.end)}`,
              ]
            : [
                `DTSTART;VALUE=DATE:${date}`,
                `DTEND;VALUE=DATE:${dateOffset(firstMonday, offset + 1)}`,
              ];
          events.push([
            "BEGIN:VEVENT",
            `UID:${escape(`${lesson.id}-${index}-${groupIndex}-${firstMonday}-${week}`)}@catalog.enthusjast.cc`,
            `DTSTAMP:${stamp()}`,
            ...dt,
            `SUMMARY:${escape(`${lesson.course.name} · 第 ${periods.join(",")} 节`)}`,
            `LOCATION:${escape(slot.location)}`,
            `DESCRIPTION:${escape(`公开教学安排；第 ${week} 周，第 ${periods.join(",")} 节；${lesson.code}；${lesson.teachers.join("、")}。${times ? `使用用户确认的课节表 ${layout}。` : "全天提醒：接口未提供准确钟点，不表示全天上课。"}实际安排以综合教务系统为准。`)}`,
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
          ]);
        }
    }
  }
  return { content: calendar(events), skipped, count: events.length };
}
export function examCalendar(exams: Exam[]) {
  const events: string[][] = [],
    skipped: string[] = [];
  for (const exam of exams) {
    if (
      !exam.date ||
      !isISODate(exam.date) ||
      exam.start === undefined ||
      exam.end === undefined ||
      exam.end <= exam.start
    ) {
      skipped.push(exam.courseCode);
      continue;
    }
    events.push([
      "BEGIN:VEVENT",
      `UID:exam-${escape(exam.id)}-${exam.date}@catalog.enthusjast.cc`,
      `DTSTAMP:${stamp()}`,
      `DTSTART:${utcDate(exam.date, exam.start)}`,
      `DTEND:${utcDate(exam.date, exam.end)}`,
      `SUMMARY:${escape(`${exam.courseName} · 考试`)}`,
      `LOCATION:${escape(exam.rooms.join("、"))}`,
      `DESCRIPTION:${escape("公开考试安排，可能次日更新。实际安排以综合教务系统为准。")}`,
      "END:VEVENT",
    ]);
  }
  return { content: calendar(events), skipped, count: events.length };
}
export function downloadCalendar(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
