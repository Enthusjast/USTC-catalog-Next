import { roomDirectory } from "./roomDirectory";
import { isISODate, todayISO } from "./dates";
export { todayISO } from "./dates";
export const lessonLink = (semester: string, code: string) => ({
  path: "/lessons",
  query: { semester, q: code, lesson: code },
});
export const teacherLink = (semester: string, teacher: string) => ({
  path: "/lessons",
  query: { semester, teacher, view: "week", source: "results" },
});
export function roomLink(location: string, date = todayISO()) {
  const name = location.trim().toUpperCase(),
    matches = roomDirectory.filter((room) =>
      [room.code, room.name, room.englishName].some(
        (alias) => alias.trim().toUpperCase() === name,
      ),
    );
  return matches.length === 1
    ? {
        path: "/classrooms",
        query: {
          date: isISODate(date) ? date : todayISO(),
          roomKey: `directory:${matches[0]!.id}`,
          roomView: "week",
        },
      }
    : undefined;
}
