import {
  timetableBlocks,
  timetableClusters,
  courseHue,
  type TimetableBlock,
} from "./timetable";
import type { Lesson } from "./models";
import { weekdays } from "./schedule";
export interface TimetableExportData {
  lessons: Lesson[];
  week: number;
  mode: "week" | "day";
  day: number;
  title: string;
}
interface ImagePage {
  lines: string[];
  board: boolean;
}
const WIDTH = 1400,
  HEIGHT = 2048,
  MARGIN = 32,
  LINE = 30,
  ROW = 52,
  BOARD_TOP = 90,
  BOARD_BOTTOM = BOARD_TOP + 40 + 14 * ROW;
function blocks(data: TimetableExportData) {
  return timetableBlocks(data.lessons, data.week).filter(
    (b) => data.mode === "week" || b.day === data.day,
  );
}
function canvas(height: number) {
  const element = document.createElement("canvas");
  element.width = WIDTH;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片导出。");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.font = "20px sans-serif";
  return { element, ctx };
}
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = [];
  let line = "";
  for (const c of text) {
    if (c === "\n") {
      result.push(line);
      line = "";
      continue;
    }
    if (ctx.measureText(line + c).width > width && line) {
      result.push(line);
      line = c;
    } else line += c;
  }
  result.push(line);
  return result;
}
function label(b: TimetableBlock) {
  return `${b.lesson.course.name} · ${b.lesson.code} | 周${weekdays[b.day - 1]} 第${b.start}–${b.end - 1}节 | ${b.lesson.teachers.join("、") || "教师未提供"} | ${b.location || "地点未提供"}`;
}
export function timetableImagePages(data: TimetableExportData): ImagePage[] {
  const { ctx } = canvas(1),
    lines = blocks(data).flatMap((b) => [
      ...wrap(ctx, label(b), WIDTH - MARGIN * 2),
      "",
    ]);
  data.lessons
    .filter((l) => l.schedule.unknown || !l.schedule.slots.length)
    .forEach((l) =>
      lines.push(
        ...wrap(
          ctx,
          `无法完整定位：${l.course.name} · ${l.code} | ${l.schedule.text || "安排未提供"}`,
          WIDTH - MARGIN * 2,
        ),
        "",
      ),
    );
  const first = Math.floor((HEIGHT - BOARD_BOTTOM - 100) / LINE),
    later = Math.floor((HEIGHT - 130) / LINE),
    pages: ImagePage[] = [{ board: true, lines: lines.splice(0, first) }];
  while (lines.length)
    pages.push({ board: false, lines: lines.splice(0, later) });
  return pages;
}
function paintBoard(ctx: CanvasRenderingContext2D, data: TimetableExportData) {
  const days = data.mode === "day" ? [data.day] : [1, 2, 3, 4, 5, 6, 7],
    left = MARGIN + 42,
    dayWidth = (WIDTH - MARGIN - left) / days.length;
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#edf3fa";
  ctx.fillRect(MARGIN, BOARD_TOP, WIDTH - MARGIN * 2, 40);
  ctx.fillStyle = "#192c40";
  days.forEach((d, i) =>
    ctx.fillText(
      `周${weekdays[d - 1]}`,
      left + (i + 0.5) * dayWidth,
      BOARD_TOP + 27,
    ),
  );
  ctx.strokeStyle = "#d9e3ee";
  for (let p = 0; p <= 14; p++) {
    const y = BOARD_TOP + 40 + p * ROW;
    ctx.beginPath();
    ctx.moveTo(MARGIN, y);
    ctx.lineTo(WIDTH - MARGIN, y);
    ctx.stroke();
    if (p < 14) {
      ctx.fillStyle = "#53677b";
      ctx.fillText(String(p + 1), MARGIN + 20, y + 31);
    }
  }
  for (let d = 0; d <= days.length; d++) {
    ctx.beginPath();
    ctx.moveTo(left + d * dayWidth, BOARD_TOP);
    ctx.lineTo(left + d * dayWidth, BOARD_BOTTOM);
    ctx.stroke();
  }
  ctx.textAlign = "left";
  for (const cluster of timetableClusters(blocks(data))) {
    const x = left + days.indexOf(cluster.day) * dayWidth,
      y = BOARD_TOP + 40 + (cluster.start - 1) * ROW;
    if (cluster.lanes > 3) {
      ctx.fillStyle = "#edf3fa";
      ctx.fillRect(
        x + 3,
        y + 3,
        dayWidth - 6,
        (cluster.end - cluster.start) * ROW - 6,
      );
      ctx.fillStyle = "#192c40";
      ctx.fillText(`${cluster.blocks.length} 项安排`, x + 10, y + 29);
      continue;
    }
    for (const block of cluster.blocks) {
      const hue = courseHue(block.lesson.course.code),
        bx = x + (block.lane / cluster.lanes) * dayWidth + 3,
        by = BOARD_TOP + 40 + (block.start - 1) * ROW + 3,
        bw = dayWidth / cluster.lanes - 6,
        bh = (block.end - block.start) * ROW - 6;
      ctx.fillStyle = `hsl(${hue} 65% 94%)`;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = `hsl(${hue} 45% 70%)`;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx + 4, by + 4, bw - 8, bh - 8);
      ctx.clip();
      ctx.fillStyle = `hsl(${hue} 50% 25%)`;
      ctx.font = "16px sans-serif";
      let row = 0;
      for (const line of [
        block.lesson.course.name,
        block.lesson.teachers.join("、"),
        block.location,
      ]) {
        ctx.fillText(line, bx + 6, by + 19 + row * 21);
        row++;
      }
      ctx.restore();
    }
  }
}
export function renderTimetablePNG(
  data: TimetableExportData,
  page: ImagePage,
  index: number,
) {
  const start = page.board ? BOARD_BOTTOM + 70 : 110,
    height = Math.max(
      page.board ? BOARD_BOTTOM + 100 : 180,
      start + page.lines.length * LINE + MARGIN,
    ),
    { element, ctx } = canvas(height);
  ctx.fillStyle = "#192c40";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(
    `${data.title} · 第 ${data.week} 周${data.mode === "day" ? ` · 周${weekdays[data.day - 1]}` : ""}`,
    MARGIN,
    44,
  );
  ctx.font = "16px sans-serif";
  ctx.fillText(`USTC-catalog-Next · ${index + 1}`, MARGIN, 70);
  if (page.board) {
    paintBoard(ctx, data);
    ctx.fillStyle = "#192c40";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("完整安排清单", MARGIN, BOARD_BOTTOM + 42);
  }
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#192c40";
  page.lines.forEach((line, i) => ctx.fillText(line, MARGIN, start + i * LINE));
  return element.toDataURL("image/png");
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function printTimetable(data: TimetableExportData) {
  const { element, ctx } = canvas(BOARD_BOTTOM + MARGIN);
  paintBoard(ctx, data);
  const rows = blocks(data).map((b) => label(b));
  data.lessons
    .filter((l) => l.schedule.unknown || !l.schedule.slots.length)
    .forEach((l) =>
      rows.push(
        `无法完整定位：${l.course.name} · ${l.code} | ${l.schedule.text || "安排未提供"}`,
      ),
    );
  const frame = document.createElement("iframe");
  frame.className = "print-frame";
  frame.style.cssText =
    "position:fixed;width:1px;height:1px;left:-9999px;border:0";
  frame.onload = () => {
    const target = frame.contentWindow;
    if (!target) return;
    target.onafterprint = () => frame.remove();
    target.focus();
    target.print();
    setTimeout(() => frame.remove(), 60000);
  };
  frame.srcdoc = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>${escape(data.title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px sans-serif;color:#192c40;background:white}h1{font-size:20px}img{width:100%;height:auto}li{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;break-inside:avoid}h2{break-after:avoid}</style><body><h1>${escape(data.title)} · 第 ${data.week} 周</h1><img src="${element.toDataURL("image/png")}" alt="课表"><h2>完整安排清单</h2><ol>${rows.map((row) => `<li>${escape(row)}</li>`).join("")}</ol></body></html>`;
  document.body.append(frame);
}
