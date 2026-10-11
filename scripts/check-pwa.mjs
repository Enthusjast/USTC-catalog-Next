import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
assert.equal(manifest.name, "USTC-catalog-Next");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
const worker = await readFile("dist/sw.js", "utf8");
const files = (await readdir("dist/assets")).filter((file) =>
  /\.(js|css)$/.test(file),
);
for (const file of files)
  assert(worker.includes(`assets/${file}`), `Missing offline asset: ${file}`);
for (const file of [
  "index.html",
  "offline.html",
  "LICENSE.txt",
  "THIRD_PARTY_NOTICES.md.txt",
])
  assert(worker.includes(file), `Missing offline entry: ${file}`);
assert(
  !worker.includes("api.catalog.enthusjast.cc"),
  "API must stay in IndexedDB caching",
);
assert(
  !worker.includes("data/archives/"),
  "Archive queries must stay in IndexedDB caching",
);
for (const icon of manifest.icons) {
  const bytes = await readFile(`dist${icon.src}`);
  const dimension = Number(icon.sizes.split("x")[0]);
  assert.equal(bytes.readUInt32BE(16), dimension);
  assert.equal(bytes.readUInt32BE(20), dimension);
  assert(
    worker.includes(icon.src.slice(1)),
    `Missing offline icon: ${icon.src}`,
  );
}
console.log(
  `PWA verified: ${files.length} JS/CSS assets, entry pages, license notices and ${manifest.icons.length} icons.`,
);
