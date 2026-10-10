import { z } from "zod";
import type { QueryResult } from "../domain/models";
import { readCache, writeCache, cacheGeneration } from "./cache";
import { restrictedSchema } from "./schemas";
import { createLimiter } from "../domain/concurrency";
import { DEMO_MODE } from "./environment";

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "https://api.catalog.enthusjast.cc"
).replace(/\/$/, "");
export const TTL = {
  reference: 24 * 60 * 60_000,
  search: 30 * 60_000,
  schedule: 30 * 60_000,
  rooms: 5 * 60_000,
};
export type ApiErrorKind =
  "network" | "http" | "content" | "json" | "schema" | "restricted";
export class ApiError extends Error {
  readonly attemptedAt = new Date().toISOString();
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public source: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
interface RequestOptions {
  base?: string;
  signal?: AbortSignal;
  ttl?: number;
  force?: boolean;
  body?: unknown;
  cacheVariant?: string;
}
interface Flight {
  promise: Promise<QueryResult<unknown>>;
  controller: AbortController;
  consumers: number;
}
const flights = new Map<string, Flight>();
const acquire = createLimiter(3);
export function mirrorPath(path: string) {
  return `/${path.replace(/^\/?api\//, "").replace(/^\//, "")}`;
}

async function fetchPayload(
  url: string,
  body: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const release = await acquire(signal);
    const timeout = new AbortController(),
      timer = setTimeout(() => timeout.abort(), 15_000);
    const abort = () => timeout.abort();
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) timeout.abort();
    try {
      const response = await fetch(url, {
        method: body === undefined ? "GET" : "POST",
        credentials: "omit",
        signal: timeout.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok)
        throw new ApiError(
          "http",
          `接口返回 HTTP ${response.status}，请稍后重试。`,
          url,
        );
      if (
        !/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(
          response.headers.get("content-type") ?? "",
        )
      )
        throw new ApiError(
          "content",
          "接口地址或返回类型异常，请检查 API 路径映射。",
          url,
        );
      try {
        return await response.json();
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        throw new ApiError(
          "json",
          "接口返回的 JSON 无法解析，请稍后重试。",
          url,
        );
      }
    } catch (error) {
      if (signal.aborted) throw new DOMException("查询已取消", "AbortError");
      if (error instanceof ApiError) throw error;
      if (attempt === 1 || body !== undefined)
        throw new ApiError(
          "network",
          "无法连接数据接口，请检查网络及当前站点的跨域访问许可。",
          url,
        );
    } finally {
      release();
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }
  throw new ApiError("network", "无法连接数据接口。", url);
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<QueryResult<T>> {
  const url = `${options.base ?? API_BASE}${mirrorPath(path)}`,
    variant = options.cacheVariant ? `:variant=${options.cacheVariant}` : "",
    key = `${url}:${JSON.stringify(options.body ?? null)}:${!!options.force}${variant}`;
  if (options.signal?.aborted)
    throw new DOMException("查询已取消", "AbortError");
  let flight = flights.get(key);
  if (!flight) {
    const controller = new AbortController();
    const promise = (async (): Promise<QueryResult<T>> => {
      const generation = cacheGeneration();
      const cacheKey = `${url}:${JSON.stringify(options.body ?? null)}${variant}`;
      const cached = await readCache(cacheKey),
        parsedCache = cached ? schema.safeParse(cached.payload) : undefined;
      const usable =
        cached && parsedCache?.success
          ? { ...cached, payload: parsedCache.data }
          : undefined;
      if (
        usable &&
        generation === cacheGeneration() &&
        !options.force &&
        Date.now() - Date.parse(usable.retrievedAt) >= 0 &&
        Date.now() - Date.parse(usable.retrievedAt) <
          (options.ttl ?? TTL.search)
      )
        return {
          data: usable.payload,
          meta: {
            source: url,
            retrievedAt: usable.retrievedAt,
            state: "cache",
          },
        };
      try {
        const payload = await fetchPayload(
          url,
          options.body,
          controller.signal,
        );
        const parsed = schema.safeParse(payload);
        if (!parsed.success)
          throw new ApiError(
            "schema",
            `接口数据格式已变化（${parsed.error.issues[0]?.message ?? "字段异常"}），暂时无法展示。`,
            url,
          );
        const retrievedAt = new Date().toISOString();
        await writeCache(
          { key: cacheKey, retrievedAt, payload: parsed.data },
          generation,
        );
        return {
          data: parsed.data,
          meta: { source: url, retrievedAt, state: "online" },
        };
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.kind === "network" &&
          usable &&
          generation === cacheGeneration()
        )
          return {
            data: usable.payload,
            meta: {
              source: url,
              retrievedAt: usable.retrievedAt,
              state: "stale",
            },
          };
        throw error;
      }
    })();
    flight = { promise, controller, consumers: 0 };
    flights.set(key, flight);
    promise
      .finally(() => {
        if (flights.get(key)?.promise === promise) flights.delete(key);
      })
      .catch(() => {});
  }
  const shared = flight;
  shared.consumers++;
  return new Promise<QueryResult<T>>((resolve, reject) => {
    let finished = false;
    const done = () => {
      if (finished) return false;
      finished = true;
      shared.consumers--;
      options.signal?.removeEventListener("abort", abort);
      if (!shared.consumers) {
        shared.controller.abort();
        if (flights.get(key) === shared) flights.delete(key);
      }
      return true;
    };
    const abort = () => {
      if (done()) reject(new DOMException("查询已取消", "AbortError"));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    shared.promise.then(
      (result) => {
        if (done()) resolve(result as QueryResult<T>);
      },
      (error) => {
        if (done()) reject(error);
      },
    );
  });
}

export async function query<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<QueryResult<T>> {
  if (DEMO_MODE) {
    if (options.signal?.aborted)
      throw new DOMException("查询已取消", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("查询已取消", "AbortError"));
      };
      const timer = setTimeout(() => {
        options.signal?.removeEventListener("abort", abort);
        resolve();
      }, 120);
      options.signal?.addEventListener("abort", abort, { once: true });
    });
    const { fixturePayload } = await import("./fixtures");
    const result = schema.safeParse(
      fixturePayload(mirrorPath(path), options.body),
    );
    if (!result.success)
      throw new ApiError("schema", "演示数据结构异常。", location.origin);
    if (options.signal?.aborted)
      throw new DOMException("查询已取消", "AbortError");
    return {
      data: result.data,
      meta: {
        retrievedAt: new Date().toISOString(),
        source: `${location.origin}/#/about/data`,
        state: "online",
        kind: "demo",
      },
    };
  }
  const restriction = await request("/restricted", restrictedSchema, {
    signal: options.signal,
    ttl: 5 * 60_000,
    force: options.force,
  });
  if (restriction.data.restricted)
    throw new ApiError(
      "restricted",
      "数据源当前限制公开查询，请访问综合教务系统或稍后重试。",
      restriction.meta.source,
    );
  const result = await request(path, schema, options);
  if (restriction.meta.state === "stale" && result.meta.state !== "online")
    result.meta.state = "stale";
  return result;
}

/** Static versioned archive assets do not belong to the mirror API namespace. */
export function readAsset<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
) {
  return request(path, schema, {
    ttl: TTL.reference,
    ...options,
    base: location.origin,
  });
}
