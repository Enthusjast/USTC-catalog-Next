import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  normalizeRooms,
  extractRooms,
  readDirectory,
  directoryDiff,
} from "./room-directory.mjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  file = join(root, "src/domain/roomDirectory.ts"),
  source = await readFile(file, "utf8"),
  current = readDirectory(source),
  args = process.argv.slice(2);
async function get(url, type) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`原站读取失败：HTTP ${response.status}`);
  if (!type.test(response.headers.get("content-type") ?? ""))
    throw new Error("原站响应类型不符");
  return response.text();
}
try {
  let rooms, provenance;
  const capture = args.indexOf("--capture");
  if (capture >= 0) {
    if (!args[capture + 1]) throw new Error("--capture 需要 JSON 文件路径");
    const snapshot = JSON.parse(await readFile(args[capture + 1], "utf8"));
    if (
      snapshot.source?.url !== "https://catalog.ustc.edu.cn/query/classroom" ||
      typeof snapshot.source?.verifiedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.source.verifiedAt) ||
      typeof snapshot.source?.bundle !== "string"
    )
      throw new Error("快照必须包含核实日期及原站来源");
    rooms = normalizeRooms(snapshot.rooms);
    provenance = snapshot.source;
  } else {
    const html = await get(current.source.url, /text\/html/);
    const refs = [
      ...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi),
    ]
      .map((m) => new URL(m[1], current.source.url))
      .filter(
        (url) =>
          url.origin === "https://catalog.ustc.edu.cn" &&
          url.pathname.startsWith("/assets/"),
      );
    if (!refs.length) throw new Error("未找到原站应用脚本");
    const candidates = [];
    for (const url of refs) {
      const body = await get(url.href, /(java|ecma)script/);
      try {
        candidates.push({ rooms: extractRooms(body), bundle: url.href });
      } catch (error) {
        if (!String(error.message).includes("未找到已知结构")) throw error;
      }
    }
    if (candidates.length !== 1)
      throw new Error("原站目录结构不唯一或无法识别");
    rooms = candidates[0].rooms;
    if (rooms.length < current.rooms.length * 0.8)
      throw new Error(
        "自动抽取的目录数量明显减少，请核对后使用带来源的 --capture 快照",
      );
    provenance = {
      url: current.source.url,
      bundle: candidates[0].bundle,
      verifiedAt: new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Shanghai",
      }),
    };
  }
  const diff = directoryDiff(current.rooms, rooms);
  console.log(
    JSON.stringify(
      {
        source: provenance,
        counts: { before: current.rooms.length, after: rooms.length },
        ...diff,
      },
      null,
      2,
    ),
  );
  if (args.includes("--write")) {
    const updatedSource = { ...current.source, ...provenance };
    let next = source;
    for (const [range, value] of [
      [current.range, rooms],
      [current.sourceRange, updatedSource],
    ].sort((a, b) => b[0][0] - a[0][0]))
      next =
        next.slice(0, range[0]) +
        JSON.stringify(value, null, 2) +
        next.slice(range[1]);
    next = next.replace(
      /verified \d{4}-\d{2}-\d{2}/,
      `verified ${updatedSource.verifiedAt}`,
    );
    const staging = `${file}.staging`;
    try {
      await writeFile(staging, next);
      await rename(staging, file);
    } finally {
      await rm(staging, { force: true });
    }
    console.log("教室目录和来源已更新；请核对差异后提交。");
  } else if (diff.added.length || diff.removed.length || diff.changed.length)
    process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  console.error("现有教室目录保持不变。");
  process.exitCode = 2;
}
