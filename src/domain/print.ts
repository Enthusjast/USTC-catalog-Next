export const escapeHTML = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function printHTML(title: string, body: string) {
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
  frame.srcdoc = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>${escapeHTML(title)}</title><style>@page{size:A4;margin:12mm}body{font:12px sans-serif;background:#fff;color:#192c40}h1{font-size:20px}h2{font-size:15px;break-after:avoid}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{padding:6px;border:1px solid #cbd5e1;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left}tr{break-inside:avoid}thead{display:table-header-group}p{white-space:pre-wrap;overflow-wrap:anywhere}</style><body>${body}</body></html>`;
  document.body.append(frame);
}
