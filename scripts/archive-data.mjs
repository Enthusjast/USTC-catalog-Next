import { parseHTML } from "linkedom";

export const archiveOrigin = "https://catalog.ustc.edu.cn";
export const historySource = "https://www.teach.ustc.edu.cn/education/241.html";
const normalized = (value) => value.replace(/\s+/g, " ").trim();
export function officialURL(value, base) {
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) &&
      (url.hostname === "ustc.edu.cn" || url.hostname.endsWith(".ustc.edu.cn"))
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function archiveDocument(record, label) {
  if (record.status !== 200 || !record.type?.includes("text/html"))
    throw Error(`${record.code}: archive source is not HTML`);
  const { document } = parseHTML(record.html);
  const root = document.querySelector("article");
  if (!root?.querySelector("h1"))
    throw Error(`${record.code}: missing archive article`);
  const source = `${archiveOrigin}${record.path}`;
  const blocks = [];
  // Course tables are factual records. Other prose stays in the official reader.
  for (const element of root.querySelectorAll("h2,h3,h4,h5,table")) {
    if (element.closest("table") && element.tagName !== "TABLE") continue;
    if (element.tagName === "TABLE") {
      const rows = [...element.querySelectorAll("tr")]
        .filter((row) => row.closest("table") === element)
        .map((row) => ({
          section:
            row.parentElement.tagName === "THEAD"
              ? "head"
              : row.parentElement.tagName === "TFOOT"
                ? "foot"
                : "body",
          cells: [...row.children]
            .filter((cell) => ["TD", "TH"].includes(cell.tagName))
            .map((cell) => ({
              text: normalized(cell.textContent),
              header: cell.tagName === "TH",
              colSpan: Math.max(
                1,
                Math.min(32, Number(cell.getAttribute("colspan")) || 1),
              ),
              rowSpan: Math.max(
                1,
                Math.min(100, Number(cell.getAttribute("rowspan")) || 1),
              ),
            })),
        }));
      if (rows.length)
        blocks.push({
          type: "table",
          caption: normalized(
            element.querySelector("caption")?.textContent ?? "",
          ),
          rows,
        });
    } else
      blocks.push({
        type: "heading",
        level: Math.min(4, Number(element.tagName.slice(1))),
        text: normalized(element.textContent),
      });
  }
  const links = [...root.querySelectorAll("a[href]")].flatMap((anchor) => {
    const url = officialURL(anchor.getAttribute("href"), source);
    return url
      ? [{ title: normalized(anchor.textContent) || "官方资料", url }]
      : [];
  });
  const kind = /^t/.test(record.code)
    ? "科技英才班"
    : /^s/.test(record.code)
      ? "学科交叉"
      : /^d/.test(record.code)
        ? "双学位"
        : record.code.length === 3
          ? "院系方案"
          : "专业方案";
  const department = /^\d{6}$/.test(record.code)
    ? label.departments[record.code.slice(0, 3)]
    : record.code.length === 3
      ? label.departments[record.code]
      : undefined;
  return {
    code: record.code,
    title: normalized(root.querySelector("h1").textContent),
    version: "2013级",
    kind,
    ...(department ? { department } : {}),
    source,
    officialPage: `${archiveOrigin}/program/${record.code}`,
    snapshotAt: record.retrievedAt,
    excerpt: normalized(root.querySelector("p")?.textContent ?? "").slice(
      0,
      24,
    ),
    blocks,
    links,
  };
}
export function archiveAttachments(html, snapshotAt) {
  const { document } = parseHTML(html);
  const records = [];
  for (const table of document.querySelectorAll("table"))
    for (const row of table.querySelectorAll("tr")) {
      const cells = [...row.querySelectorAll("td")];
      const version = normalized(cells[0]?.textContent ?? "");
      if (!/^\d{2,4}$/.test(version)) continue;
      const year = version.length === 2 ? `20${version}` : version;
      for (const anchor of row.querySelectorAll("a[href]")) {
        const source = officialURL(anchor.getAttribute("href"), historySource);
        if (!source) continue;
        records.push({
          id: `${year}-${records.length}`,
          title: normalized(anchor.textContent) || "官方附件",
          version: `${year}版`,
          source,
          kind: source.toLowerCase().includes(".pdf") ? "PDF" : "官方页面",
          snapshotAt,
        });
      }
    }
  if (!records.length)
    throw Error("Official history archive has no versioned attachments");
  return records;
}
export function archiveLabels(links) {
  return {
    departments: Object.fromEntries(
      links
        .filter((link) => /^\d{3}$/.test(link.code))
        .map((link) => [link.code, link.name.replace(/^\d{3}/, "")]),
    ),
  };
}
