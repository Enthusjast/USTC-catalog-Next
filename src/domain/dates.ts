export function isISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addISODate(value: string, days: number) {
  if (!isISODate(value)) throw new Error("日期无效");
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function weekDates(value: string) {
  if (!isISODate(value)) return [];
  const date = new Date(`${value}T12:00:00Z`),
    monday = addISODate(value, -((date.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addISODate(monday, i));
}
export function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}
export function isFirstMonday(value: string) {
  return isISODate(value) && new Date(`${value}T12:00:00Z`).getUTCDay() === 1;
}
export function teachingWeek(firstMonday: string, date: string) {
  if (!isFirstMonday(firstMonday) || !isISODate(date)) return undefined;
  const week =
    Math.floor(
      (Date.parse(`${date}T12:00:00Z`) -
        Date.parse(`${firstMonday}T12:00:00Z`)) /
        (7 * 86400000),
    ) + 1;
  return week >= 1 && week <= 53 ? week : undefined;
}
