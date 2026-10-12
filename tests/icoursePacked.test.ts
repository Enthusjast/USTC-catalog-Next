import { describe, it, expect } from "vitest";
import { buildIcourseIndex } from "../src/domain/icourse";
import {
  packIcourseIndex,
  decodeIcourseIndex,
} from "../src/domain/icoursePacked";
import { getIcourseIndex, icoursePacked } from "../src/data/icourseLinks";
describe("packed review dictionary", () => {
  it("decodes the same facts once and reduces the shipped representation by at least 30 percent", () => {
    const index = getIcourseIndex();
    expect(getIcourseIndex()).toBe(index);
    expect(decodeIcourseIndex(icoursePacked)).toEqual(index);
    expect(
      new TextEncoder().encode(JSON.stringify(icoursePacked)).length,
    ).toBeLessThan(
      new TextEncoder().encode(JSON.stringify(index)).length * 0.7,
    );
  });
  it("roundtrips punctuation and complete teacher sets, retaining unscored links", () => {
    const { index } = buildIcourseIndex([
      {
        name: "中文(A) & English",
        teachers: ["乙", "甲", "甲"],
        "icourse-id": 1,
        score: "暂无评分",
      },
      { name: "中文(A) & English", teachers: ["甲"], "icourse-id": 2 },
    ]);
    expect(decodeIcourseIndex(packIcourseIndex(index))).toEqual(index);
  });
  it("rejects corrupt dictionary references and duplicate facts", () => {
    for (const packed of [
      { ...icoursePacked, entries: [[999999, 0, "1"]] },
      { ...icoursePacked, teacherSets: [[999999]] },
      {
        ...icoursePacked,
        entries: [icoursePacked.entries[0], icoursePacked.entries[0]],
      },
    ])
      expect(() =>
        decodeIcourseIndex(packed as typeof icoursePacked),
      ).toThrow();
  });
});
