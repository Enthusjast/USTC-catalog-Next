import { clockMinutes } from "./schedule";
// Period layouts transcribed from the MIT-licensed USTC-catalog-CLI schedule model.
// The user must choose a layout; no campus-to-layout assumption is made.
export const periodLayouts: Record<string, Record<number, [number, number]>> = {
  "1": {
    1: [750, 835],
    2: [840, 925],
    3: [945, 1030],
    4: [1035, 1120],
    5: [1125, 1210],
    6: [1400, 1445],
    7: [1450, 1535],
    8: [1555, 1640],
    9: [1645, 1730],
    10: [1735, 1820],
    11: [1930, 2015],
    12: [2020, 2105],
    13: [2110, 2155],
  },
  "2": {
    1: [800, 845],
    2: [850, 935],
    3: [1010, 1055],
    4: [1100, 1145],
    6: [1400, 1445],
    7: [1450, 1535],
    8: [1610, 1655],
    9: [1700, 1745],
    10: [1750, 1835],
    11: [1930, 2015],
    12: [2020, 2105],
    13: [2110, 2155],
  },
};
export function periodTimes(layout: string, periods: number[]) {
  const table = periodLayouts[layout];
  if (!table || !periods.length || periods.some((p) => !table[p]))
    return undefined;
  return {
    start: clockMinutes(table[Math.min(...periods)]![0])!,
    end: clockMinutes(table[Math.max(...periods)]![1])!,
  };
}
