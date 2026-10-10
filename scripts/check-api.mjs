import * as schema from "../src/api/schemas.ts";

const base = (
  process.env.VITE_API_BASE_URL ?? "https://api.catalog.enthusjast.cc"
).replace(/\/$/, "");
const origin = "https://catalog.enthusjast.cc";
const checks = [];
async function probe(path, options = {}) {
  try {
    const response = await fetch(`${base}${path}`, {
      credentials: "omit",
      ...options,
      headers: {
        Origin: origin,
        Accept: "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      /* Report non-JSON responses below. */
    }
    return { response, data, path };
  } catch (error) {
    return { path, error: error.message };
  }
}
function record(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
}
function cors(result) {
  if (result.error) return;
  const allowed = result.response.headers.get("access-control-allow-origin");
  record(
    `${result.path}: Origin`,
    allowed === origin,
    `Access-Control-Allow-Origin: ${allowed ?? "未提供"}`,
  );
}
function json(result, validator) {
  if (result.error) {
    record(result.path, false, result.error);
    return;
  }
  const type = result.response.headers.get("content-type") ?? "";
  record(
    `${result.path}: JSON/schema`,
    result.response.ok &&
      /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(type) &&
      validator.safeParse(result.data).success,
    `HTTP ${result.response.status}, ${type || "Content-Type 未提供"}`,
  );
  cors(result);
}
if (new URL(base).protocol !== "https:")
  throw Error("Release API must use HTTPS");
const restricted = await probe("/restricted");
json(restricted, schema.restrictedSchema);
record(
  "公开查询许可",
  restricted.data?.restricted === false,
  `restricted=${restricted.data?.restricted}`,
);
json(await probe("/teach/semester/list"), schema.semesterSchema);
for (const item of [
  { path: "/teach/course/infos", body: { codes: ["MATH1006"] } },
  {
    path: "/teach/lesson/infos",
    body: { codes: ["022063.01"], semester: 461 },
  },
]) {
  const preflight = await probe(item.path, {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  if (preflight.error) record(`${item.path}: OPTIONS`, false, preflight.error);
  else {
    const headers = preflight.response.headers;
    const methods = (headers.get("access-control-allow-methods") ?? "")
      .toUpperCase()
      .split(",")
      .map((value) => value.trim());
    const requestHeaders = (headers.get("access-control-allow-headers") ?? "")
      .toLowerCase()
      .split(",")
      .map((value) => value.trim());
    record(
      `${item.path}: OPTIONS`,
      preflight.response.ok &&
        headers.get("access-control-allow-origin") === origin &&
        (methods.includes("POST") || methods.includes("*")) &&
        (requestHeaders.includes("content-type") ||
          requestHeaders.includes("*")),
      `HTTP ${preflight.response.status}; Origin=${headers.get("access-control-allow-origin")}; methods=${methods.join(",")}; headers=${requestHeaders.join(",")}`,
    );
  }
  json(
    await probe(item.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.body),
    }),
    schema.courseDetailSchema,
  );
}
const unknown = await probe("/__catalog_explorer_unknown__");
record(
  "未知路径 JSON 404",
  !unknown.error &&
    unknown.response.status === 404 &&
    /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(
      unknown.response.headers.get("content-type") ?? "",
    ) &&
    unknown.data !== undefined,
  unknown.error ??
    `HTTP ${unknown.response.status}, ${unknown.response.headers.get("content-type")}`,
);
cors(unknown);
const unapprovedOrigin = "https://unapproved.example";
for (const item of [
  { path: "/restricted", method: "GET", headers: {} },
  {
    path: "/teach/course/infos",
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  },
  {
    path: "/teach/lesson/infos",
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  },
]) {
  const result = await probe(item.path, {
    method: item.method,
    headers: { ...item.headers, Origin: unapprovedOrigin },
  });
  const allowed = result.response?.headers.get("access-control-allow-origin");
  record(
    `${item.path}: ${item.method} 拒绝未授权 Origin`,
    !result.error &&
      (result.response.ok || result.response.status === 403) &&
      allowed !== "*" &&
      allowed !== unapprovedOrigin,
    result.error ??
      `HTTP ${result.response.status}; Origin=${allowed ?? "未提供"}`,
  );
}
const report = [
  "| 检查 | 结果 | 观察 |",
  "| --- | --- | --- |",
  ...checks.map(
    (check) =>
      `| ${check.name} | ${check.ok ? "通过" : "未通过"} | ${check.detail.replace(/\|/g, "\\|")} |`,
  ),
].join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## API 发布检查\n\n${report}\n\nHTTP 检查不能代替正式页面的浏览器跨域验收。\n`,
  );
}
if (checks.some((check) => !check.ok)) process.exitCode = 1;
