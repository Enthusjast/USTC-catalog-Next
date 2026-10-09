import { z } from "zod";
const officialURL = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      (url.hostname === "ustc.edu.cn" || url.hostname.endsWith(".ustc.edu.cn"))
    );
  }, "归档来源必须为科大官方域名");
const summary = z.object({
  code: z.string().regex(/^(?:\d{3}(?:\d{3})?|[tsd]\d{1,2})$/),
  title: z.string(),
  version: z.literal("2013级"),
  kind: z.string(),
  department: z.string().optional(),
  source: officialURL,
  officialPage: officialURL,
  snapshotAt: z.string().datetime(),
});
const row = z.object({
  section: z.enum(["head", "body", "foot"]),
  cells: z.array(
    z.object({
      text: z.string(),
      header: z.boolean(),
      colSpan: z.number().int().min(1).max(32),
      rowSpan: z.number().int().min(1).max(100),
    }),
  ),
});
export const archiveDocumentSchema = summary.extend({
  excerpt: z.string(),
  blocks: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("heading"),
        level: z.number().int().min(2).max(4),
        text: z.string(),
      }),
      z.object({
        type: z.literal("table"),
        caption: z.string(),
        rows: z.array(row),
      }),
    ]),
  ),
  links: z.array(z.object({ title: z.string(), url: officialURL })),
});
export const archiveIndexSchema = z.object({
  snapshotAt: z.string().datetime(),
  source: officialURL,
  historySource: officialURL,
  documents: z.array(summary),
  attachments: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      version: z.string(),
      source: officialURL,
      kind: z.enum(["PDF", "官方页面"]),
      snapshotAt: z.string().datetime(),
    }),
  ),
});
export type ArchiveDocument = z.infer<typeof archiveDocumentSchema>;
