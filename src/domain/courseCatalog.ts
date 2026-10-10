/** Public subject codes and source IDs from the official catalogue and USTC-catalog-CLI. */
export const publicCourseCatalogues = [
  { code: "ma", name: "数学类", sourceIds: ["43"] },
  { code: "ph", name: "物理类", sourceIds: ["45"] },
  { code: "fl", name: "英语类", sourceIds: ["59"] },
  { code: "hs+ps", name: "人文、思政类", sourceIds: ["58", "63"] },
  { code: "pe", name: "体育类", sourceIds: ["66"] },
  {
    code: "cs+es+in",
    name: "计算机、电子类",
    sourceIds: ["49", "41", "47", "102"],
  },
  { code: "ch+ms+bi", name: "化学、生物类", sourceIds: ["44", "54", "53"] },
  {
    code: "ge+gp+ae+en",
    name: "地球、环境类",
    sourceIds: ["50", "52", "55", "46"],
  },
];
export type PublicCourseCatalogue = (typeof publicCourseCatalogues)[number];
