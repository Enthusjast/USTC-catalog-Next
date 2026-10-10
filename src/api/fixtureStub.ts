/** Production replacement prevents bundling invented development records. */
export function fixturePayload(_path: string, _body?: unknown): never {
  throw new Error("演示数据不适用于发布构建。");
}
