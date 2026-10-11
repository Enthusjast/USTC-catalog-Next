import ts from "typescript";
const unknown = Symbol("unsupported expression");
export function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(node) && node.text === "undefined") return undefined;
  if (ts.isPrefixUnaryExpression(node)) {
    const value = literal(node.operand);
    if (value === unknown) return unknown;
    if (node.operator === ts.SyntaxKind.ExclamationToken) return !value;
    if (node.operator === ts.SyntaxKind.MinusToken && typeof value === "number")
      return -value;
    return unknown;
  }
  if (ts.isArrayLiteralExpression(node)) {
    const result = node.elements.map(literal);
    return result.includes(unknown) ? unknown : result;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isIdentifier(property.name) &&
          !ts.isStringLiteral(property.name) &&
          !ts.isNumericLiteral(property.name))
      )
        return unknown;
      const value = literal(property.initializer);
      if (value === unknown) return unknown;
      Object.defineProperty(result, property.name.text, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return result;
  }
  return unknown;
}
export function normalizeRooms(records, raw = false) {
  if (!Array.isArray(records) || !records.length)
    throw new Error("教室目录为空或格式无效");
  if (
    raw &&
    records.some((room) =>
      [room.enabled, room.canBorrow, room.arrangeSchedule].some(
        (value) => typeof value !== "boolean",
      ),
    )
  )
    throw new Error("教室可见性字段无法确认");
  const source = raw
    ? records.filter(
        (room) =>
          room.enabled === true &&
          (room.canBorrow === true || room.arrangeSchedule === true),
      )
    : records;
  if (!source.length) throw new Error("没有可核实的可见教室");
  const result = source.map((room) => {
    const name = raw ? room.nameZh : room.name,
      englishName = raw ? room.nameEn : room.englishName;
    if (
      !Number.isInteger(room.id) ||
      room.id < 0 ||
      typeof room.code !== "string" ||
      !room.code.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof room.buildingCode !== "string" ||
      !room.buildingCode.trim() ||
      typeof englishName !== "string" ||
      (room.floor !== undefined && !Number.isInteger(room.floor))
    )
      throw new Error("教室目录包含不完整或无效字段");
    return {
      id: room.id,
      code: room.code,
      name,
      englishName,
      buildingCode: room.buildingCode,
      ...(room.floor !== undefined ? { floor: room.floor } : {}),
    };
  });
  if (new Set(result.map((room) => room.id)).size !== result.length)
    throw new Error("教室标识重复");
  return result.sort(
    (a, b) =>
      a.buildingCode.localeCompare(b.buildingCode, "zh", { numeric: true }) ||
      (a.floor ?? Infinity) - (b.floor ?? Infinity) ||
      a.code.localeCompare(b.code, "zh", { numeric: true }),
  );
}
export function extractRooms(source) {
  const file = ts.createSourceFile(
      "catalog.js",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    ),
    candidates = [];
  function visit(node) {
    if (ts.isArrayLiteralExpression(node) && node.elements.length >= 50) {
      const rows = literal(node);
      if (
        rows !== unknown &&
        Array.isArray(rows) &&
        rows.every(
          (row) =>
            row &&
            typeof row === "object" &&
            "buildingCode" in row &&
            "nameZh" in row &&
            "enabled" in row &&
            "canBorrow" in row &&
            "arrangeSchedule" in row,
        )
      ) {
        candidates.push(normalizeRooms(rows, true));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  candidates.sort((a, b) => b.length - a.length);
  const chosen = candidates[0];
  if (!chosen)
    throw new Error("未找到已知结构的教室目录，请使用核实后的 --capture JSON");
  const index = new Map(chosen.map((room) => [room.id, JSON.stringify(room)]));
  if (
    candidates.some((rows) =>
      rows.some((room) => index.get(room.id) !== JSON.stringify(room)),
    )
  )
    throw new Error("存在不一致的教室目录候选，未覆盖现有目录");
  return chosen;
}
export function readDirectory(source) {
  const file = ts.createSourceFile(
    "roomDirectory.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let data, sourceInfo, range, sourceRange;
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      if (node.name.text === "roomDirectory") {
        data = literal(node.initializer);
        range = [node.initializer.getStart(file), node.initializer.end];
      }
      if (node.name.text === "roomDirectorySource") {
        sourceInfo = literal(node.initializer);
        sourceRange = [node.initializer.getStart(file), node.initializer.end];
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!range || !sourceRange || !sourceInfo || data === unknown)
    throw new Error("本地目录结构无法识别");
  return {
    rooms: normalizeRooms(data),
    source: sourceInfo,
    range,
    sourceRange,
  };
}
export function directoryDiff(before, after) {
  const a = new Map(before.map((r) => [r.id, r])),
    b = new Map(after.map((r) => [r.id, r]));
  return {
    added: after.filter((r) => !a.has(r.id)),
    removed: before.filter((r) => !b.has(r.id)),
    changed: after
      .filter(
        (r) => a.has(r.id) && JSON.stringify(a.get(r.id)) !== JSON.stringify(r),
      )
      .map((r) => ({ before: a.get(r.id), after: r })),
  };
}
