import { readAsset } from "./client";
import { archiveIndexSchema, archiveDocumentSchema } from "./archiveSchemas";
type Options = { signal?: AbortSignal; force?: boolean };
export const archives = {
  async index(options?: Options) {
    const result = await readAsset(
      "/data/archives/index.json",
      archiveIndexSchema,
      options,
    );
    return {
      ...result,
      meta: {
        ...result.meta,
        source: result.data.source,
        kind: "archive" as const,
        snapshotAt: result.data.snapshotAt,
      },
    };
  },
  async document(code: string, options?: Options) {
    if (!/^(?:\d{3}(?:\d{3})?|[tsd]\d{1,2})$/.test(code))
      throw new Error("历史文档编号无效。");
    const result = await readAsset(
      `/data/archives/${code}.json`,
      archiveDocumentSchema,
      options,
    );
    return {
      ...result,
      meta: {
        ...result.meta,
        source: result.data.source,
        kind: "archive" as const,
        snapshotAt: result.data.snapshotAt,
      },
    };
  },
};
