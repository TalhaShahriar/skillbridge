import { describe, expect, it } from "vitest";
import {
  AddSkillsInputSchema,
  UpdateProfileSchema,
  UpdateSkillLevelSchema,
} from "@/server/schemas";
import {
  parseEducationJson,
  resolveSkillAdditions,
} from "@/server/services/profile";

describe("profile schemas and helpers", () => {
  it("validates UpdateProfileSchema", () => {
    const valid = UpdateProfileSchema.parse({
      education: [
        {
          degree: "BSc in CSE",
          institution: "Example University",
          year: "2026",
        },
      ],
      experienceLevel: "ENTRY",
      interests: ["Backend", "Data Engineering"],
      targetRoleId: "role_1",
    });

    expect(valid.education).toHaveLength(1);
    expect(valid.experienceLevel).toBe("ENTRY");
  });

  it("rejects invalid UpdateProfileSchema fields", () => {
    expect(() =>
      UpdateProfileSchema.parse({
        education: [{ degree: "", institution: "Uni" }],
      })
    ).toThrow();

    expect(() =>
      UpdateProfileSchema.parse({
        experienceLevel: "INVALID_LEVEL",
      })
    ).toThrow();
  });

  it("validates AddSkillsInputSchema and UpdateSkillLevelSchema", () => {
    const parsed = AddSkillsInputSchema.parse({
      skills: [{ name: "React" }, { skillId: "sk_1", level: "ADVANCED" }],
    });
    expect(parsed.skills[0].level).toBe("BEGINNER");
    expect(parsed.skills[1].level).toBe("ADVANCED");

    expect(() =>
      AddSkillsInputSchema.parse({
        skills: [{ level: "BEGINNER" }],
      })
    ).toThrow();

    expect(UpdateSkillLevelSchema.parse({ level: "INTERMEDIATE" })).toEqual({
      level: "INTERMEDIATE",
    });
  });

  it("resolveSkillAdditions normalizes names, deduplicates, and separates unrecognized", () => {
    const validSkillIds = new Set(["sk_react", "sk_ts", "sk_pg"]);
    const normalize = (term: string) => {
      const t = term.trim().toLowerCase();
      if (t === "reactjs" || t === "react") return "sk_react";
      if (t === "ts" || t === "typescript") return "sk_ts";
      if (t === "postgres") return "sk_pg";
      return null;
    };

    const result = resolveSkillAdditions(
      [
        { name: "reactjs", level: "BEGINNER" },
        { name: "React", level: "INTERMEDIATE" },
        { skillId: "sk_pg", level: "ADVANCED" },
        { name: "UnknownToolXYZ", level: "BEGINNER" },
        { skillId: "sk_missing", level: "BEGINNER" },
      ],
      normalize,
      validSkillIds
    );

    expect(result.resolved).toEqual([
      { skillId: "sk_react", level: "INTERMEDIATE" },
      { skillId: "sk_pg", level: "ADVANCED" },
    ]);
    expect(result.unrecognized).toEqual(["UnknownToolXYZ", "sk_missing"]);
  });

  it("parseEducationJson safely falls back to [] on malformed JSON", () => {
    expect(parseEducationJson(null)).toEqual([]);
    expect(parseEducationJson("not-an-array")).toEqual([]);
    expect(
      parseEducationJson([
        { degree: "BSc", institution: "ABC Univ", year: "2026" },
      ])
    ).toEqual([{ degree: "BSc", institution: "ABC Univ", year: "2026" }]);
  });
});
