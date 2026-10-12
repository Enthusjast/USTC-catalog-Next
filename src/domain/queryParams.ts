import type { LocationQuery, LocationQueryValue } from "vue-router";
import { isISODate } from "./dates";
type Parser = (value: string) => string | undefined;
export const integerParam =
  (min: number, max: number): Parser =>
  (value) => {
    const number = Number(value);
    return /^\d+$/.test(value) &&
      Number.isSafeInteger(number) &&
      number >= min &&
      number <= max
      ? String(number)
      : undefined;
  };
export const dateParam: Parser = (value) =>
  isISODate(value) ? value : undefined;
export const enumParam =
  (...values: string[]): Parser =>
  (value) =>
    values.includes(value) ? value : undefined;
const sort = enumParam("code", "name", "department"),
  flag = enumParam("1");
const rules: Record<string, Record<string, Parser>> = {
  "/courses": {
    mode: enumParam("search", "quality", "public", "saved"),
    sort,
    history: flag,
    saved: flag,
  },
  "/lessons": {
    view: enumParam("list", "week"),
    source: enumParam("candidates", "results"),
    ttMode: enumParam("week", "day"),
    ttDay: integerParam(1, 7),
    day: integerParam(1, 7),
    period: integerParam(1, 14),
    week: integerParam(1, 53),
    sort,
  },
  "/exams": {
    kind: enumParam("course", "general"),
    view: enumParam("list", "week"),
    date: dateParam,
    week: dateParam,
    saved: flag,
  },
  "/classrooms": {
    date: dateParam,
    type: enumParam(
      "lessons",
      "tmpLessons",
      "roomOccupies",
      "exams",
      "makeupExams",
      "tmpExams",
    ),
  },
  "/substitutions": { side: enumParam("both", "substitute", "original") },
};
const paginated = new Set([
  "/courses",
  "/programs",
  "/lessons",
  "/exams",
  "/archives",
  "/substitutions",
]);
export function normalizeQuery(
  path: string,
  query: LocationQuery,
): LocationQuery {
  const parsers = {
    ...rules[path],
    ...(paginated.has(path)
      ? { page: integerParam(1, Number.MAX_SAFE_INTEGER) }
      : {}),
    ...(/^\/programs\/[^/]+$/.test(path)
      ? { view: enumParam("modules", "terms", "offerings") }
      : {}),
  };
  const next: LocationQuery = { ...query };
  for (const [name, parse] of Object.entries(parsers)) {
    if (!(name in next)) continue;
    const raw: LocationQueryValue | LocationQueryValue[] = next[name]!;
    const value = typeof raw === "string" ? parse(raw) : undefined;
    if (value === undefined || value === "") delete next[name];
    else next[name] = value;
  }
  return next;
}
