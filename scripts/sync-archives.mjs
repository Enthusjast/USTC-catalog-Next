import { mkdir, writeFile, readFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  archiveOrigin,
  historySource,
  archiveDocument,
  archiveAttachments,
  archiveLabels,
} from "./archive-data.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
async function text(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "text/html" },
  });
  if (!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.includes("text/html"))
    throw Error(`${url}: not HTML`);
  return {
    body: await response.text(),
    type: response.headers.get("content-type"),
    retrievedAt: new Date().toISOString(),
  };
}
const capture = process.argv.indexOf("--capture");
let records, links, historyHTML, snapshotAt;
if (capture >= 0) {
  const directory = process.argv[capture + 1];
  if (!directory) throw Error("--capture requires a directory");
  records = JSON.parse(
    await readFile(join(directory, "ustc-archives-all.json"), "utf8"),
  );
  links = JSON.parse(
    await readFile(join(directory, "ustc-archive-links.json"), "utf8"),
  );
  historyHTML = await readFile(
    join(directory, "ustc-history-index.html"),
    "utf8",
  );
  snapshotAt = records
    .map((record) => record.retrievedAt)
    .sort()
    .at(-1);
} else {
  // The SPA index has no server-rendered links. Refresh the established document set.
  const existing = JSON.parse(
    await readFile(join(root, "public/data/archives/index.json"), "utf8"),
  );
  links = existing.documents.map((document) => ({
    code: document.code,
    name:
      document.code.length === 3
        ? (document.department ?? document.title)
        : document.title,
  }));
  records = new Array(links.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (cursor < links.length) {
        const index = cursor++,
          code = links[index].code,
          path = `/data/program/cn/${code}.html`;
        const response = await text(`${archiveOrigin}${path}`);
        records[index] = {
          code,
          path,
          status: 200,
          type: response.type,
          html: response.body,
          retrievedAt: response.retrievedAt,
        };
      }
    }),
  );
  const history = await text(historySource);
  historyHTML = history.body;
  snapshotAt = history.retrievedAt;
}
const labels = archiveLabels(links);
const documents = records.map((record) => archiveDocument(record, labels));
const attachments = archiveAttachments(historyHTML, snapshotAt);
const destination = join(root, "public/data/archives"),
  staging = join(root, "public/data/.archives-staging");
await mkdir(staging, { recursive: true });
for (const document of documents)
  await writeFile(
    join(staging, `${document.code}.json`),
    JSON.stringify(document),
  );
const manifest = {
  snapshotAt,
  source: `${archiveOrigin}/program`,
  historySource,
  documents: documents.map(
    ({ blocks, excerpt, links: _links, ...summary }) => summary,
  ),
  attachments,
};
await writeFile(join(staging, "index.json"), JSON.stringify(manifest));
// Every source is parsed successfully before replacing the versioned snapshot.
await rm(destination, { recursive: true, force: true });
await rename(staging, destination);
console.log(
  `Archived ${documents.length} historical documents and ${attachments.length} versioned official attachments.`,
);
