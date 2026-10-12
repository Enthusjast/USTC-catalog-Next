import { describe, expect, it } from "vitest";
import {
  buildIcourseIndex,
  icourseKey,
  icourseLink,
} from "../src/domain/icourse";
import { getIcourseIndex, icourseSource } from "../src/data/icourseLinks";

const icourseIndex = getIcourseIndex();
const row = (
  name: string,
  teachers: string[],
  id: string,
  score = "暂无评分",
) => ({ name, teachers, "icourse-id": id, score });
const lesson = (name: string, teachers: string[], code = "SAME.01") => ({
  course: { code, name },
  teachers,
});
describe("icourse matching", () => {
  it("matches the complete teacher set, independently of order and repeated names", () => {
    const { index } = buildIcourseIndex([row("课程", ["甲", "乙"], "1")]);
    expect(icourseLink(lesson(" 课程 ", ["乙 ", "甲", "甲"]), index).url).toBe(
      "https://www.icourse.club/course/1/",
    );
    expect(icourseLink(lesson("课程", ["甲"]), index).direct).toBe(false);
    expect(icourseLink(lesson("课程", ["甲", "乙", "丙"]), index).direct).toBe(
      false,
    );
  });
  it("keeps different teachers and different semester assignments separate", () => {
    const { index } = buildIcourseIndex([
      row("课程", ["甲"], "1"),
      row("课程", ["乙"], "2"),
    ]);
    expect(icourseLink(lesson("课程", ["甲"]), index).url).toContain(
      "/course/1/",
    );
    expect(icourseLink(lesson("课程", ["乙"]), index).url).toContain(
      "/course/2/",
    );
    expect(icourseLink(lesson("课程", ["丙"]), index).direct).toBe(false);
  });
  it("retains unscored pages and removes ambiguous mappings rather than taking the last one", () => {
    const result = buildIcourseIndex([
      row("唯一", ["甲"], "1"),
      row("唯一", ["甲"], "1", "9.8"),
      row("歧义", ["甲"], "2"),
      row("歧义", ["甲"], "3"),
      row("未知", [], "4"),
    ]);
    expect(result.unique).toBe(1);
    expect(result.ambiguous).toBe(1);
    expect(result.unmatchable).toBe(1);
    expect(icourseLink(lesson("唯一", ["甲"]), result.index).direct).toBe(true);
    expect(icourseLink(lesson("歧义", ["甲"]), result.index).label).toBe(
      "评课搜索",
    );
  });
  it("encodes search terms and falls back for missing teachers, missing index or invalid IDs", () => {
    const term = "中文 & English / 甲+乙",
      query = lesson(term, []);
    expect(icourseLink(query).url).toBe(
      `https://www.icourse.club/search/?q=${encodeURIComponent(term)}`,
    );
    expect(icourseKey("课程", [])).toBeUndefined();
    expect(
      icourseLink(lesson("课程", ["甲"]), {
        [icourseKey("课程", ["甲"])!]: "../other",
      }).direct,
    ).toBe(false);
  });
  it("preserves punctuation, internal whitespace and foreign teacher names", () => {
    expect(icourseKey("课程(A)", ["Salah Salmi"])).not.toBe(
      icourseKey("课程（A）", ["Salah Salmi"]),
    );
    expect(icourseKey("课程", ["Salah  Salmi"])).not.toBe(
      icourseKey("课程", ["Salah Salmi"]),
    );
    expect(icourseKey("a#b", ["c,d"])).not.toBe(icourseKey("a", ["b#c", "d"]));
  });
  it("rejects malformed source data", () => {
    for (const input of [
      [],
      {},
      [row("课程", ["甲"], "javascript:1")],
      [row("", ["甲"], "1")],
      [row("课程", [4] as unknown as string[], "1")],
    ])
      expect(() => buildIcourseIndex(input)).toThrow();
  });
  it("ships checked factual links including no-score records, with a dated source hash", () => {
    expect(Object.keys(icourseIndex)).toHaveLength(icourseSource.unique);
    expect(icourseSource.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(icourseSource.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      icourseLink(lesson("单变量微积分", ["李娟"]), icourseIndex).url,
    ).toBe("https://www.icourse.club/course/1208/");
    expect(
      icourseLink(
        lesson("仪器分析实验", [
          "孙晴",
          "柯玉萍",
          "张万群",
          "胡万群",
          "盛翔",
          "邵伟",
          "杨凯平",
          "李维维",
        ]),
        icourseIndex,
      ).url,
    ).toBe("https://www.icourse.club/course/386/");
    expect(
      icourseLink(lesson("时间序列分析", ["刘杰"]), icourseIndex).direct,
    ).toBe(false);
  });
});
