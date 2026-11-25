import { describe, expect, it } from "vitest";
import {
  computeSkillGap,
  scoreJob,
  type RoleSkillInput,
} from "@/server/services/analysis";

const sampleRoleSkills: RoleSkillInput[] = [
  { skillId: "sql", name: "SQL", category: "Language", weight: 3 },
  { skillId: "python", name: "Python", category: "Language", weight: 2 },
  { skillId: "excel", name: "Excel", category: "Data/ML", weight: 3 },
  { skillId: "tableau", name: "Tableau", category: "Data/ML", weight: 1 },
];

describe("computeSkillGap", () => {
  it("handles empty roleSkills (e.g. no target role or Other role)", () => {
    const gap = computeSkillGap(["sql", "python"], []);
    expect(gap).toEqual({
      readinessPct: 0,
      matched: [],
      missing: [],
      totalWeight: 0,
      matchedWeight: 0,
    });
  });

  it("handles user with no skills", () => {
    const gap = computeSkillGap([], sampleRoleSkills);
    expect(gap.readinessPct).toBe(0);
    expect(gap.matched).toEqual([]);
    expect(gap.totalWeight).toBe(9);
    expect(gap.matchedWeight).toBe(0);
    expect(gap.missing.map((s) => s.skillId)).toEqual([
      "excel",
      "sql",
      "python",
      "tableau",
    ]);
  });

  it("handles role with zero total weight without NaN", () => {
    const zeroWeightSkills: RoleSkillInput[] = [
      { skillId: "sql", name: "SQL", category: "Language", weight: 0 },
    ];
    const gap = computeSkillGap(["sql"], zeroWeightSkills);
    expect(gap.readinessPct).toBe(0);
    expect(gap.totalWeight).toBe(0);
    expect(gap.matched).toHaveLength(1);
  });

  it("computes weighted readiness % to 1 decimal and sorts missing by weight desc", () => {
    // User has SQL (3) + Tableau (1) = 4 / 9 = 44.4%
    const gap = computeSkillGap(["sql", "tableau"], sampleRoleSkills);
    expect(gap.readinessPct).toBe(44.4);
    expect(gap.matchedWeight).toBe(4);
    expect(gap.totalWeight).toBe(9);
    expect(gap.matched.map((s) => s.skillId)).toEqual(["sql", "tableau"]);
    expect(gap.missing.map((s) => s.skillId)).toEqual(["excel", "python"]);
  });

  it("returns 100% when all required skills are matched", () => {
    const gap = computeSkillGap(
      ["sql", "python", "excel", "tableau"],
      sampleRoleSkills
    );
    expect(gap.readinessPct).toBe(100);
    expect(gap.missing).toEqual([]);
  });
});

describe("scoreJob", () => {
  const weightMap = new Map<string, number>([
    ["sql", 3],
    ["python", 2],
    ["excel", 3],
  ]);

  it("returns 0 when job has no skills or user has no skills", () => {
    expect(scoreJob([], ["sql"], weightMap).matchPct).toBe(0);
    expect(scoreJob(["sql", "python"], [], weightMap).matchPct).toBe(0);
  });

  it("uses target role weightMap and defaults unknown job skills to weight 1", () => {
    // Job requires sql (weight 3), python (weight 2), git (default weight 1) -> total 6
    // User has sql (3) + git (1) -> matched 4 / 6 = 66.7%
    const result = scoreJob(
      ["sql", "python", "git"],
      ["sql", "git"],
      weightMap
    );
    expect(result.matchPct).toBe(66.7);
    expect(result.matching).toEqual(["sql", "git"]);
    expect(result.missing).toEqual(["python"]);
    expect(result.totalWeight).toBe(6);
    expect(result.matchedWeight).toBe(4);
  });

  it("deduplicates jobSkillIds and returns 100 when all matched", () => {
    const result = scoreJob(["sql", "sql", "git"], ["sql", "git"], weightMap);
    expect(result.matchPct).toBe(100);
    expect(result.matching).toEqual(["sql", "git"]);
    expect(result.missing).toEqual([]);
  });
});
