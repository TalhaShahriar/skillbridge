import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const SkillSeedSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  ambiguous: z.boolean().optional(),
});

const RoleSeedSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  titleKeywords: z.array(z.string().min(1)),
  skills: z.array(
    z.object({
      name: z.string().min(1),
      weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    })
  ),
});

describe("seed data integrity", () => {
  const skillsPath = path.resolve(process.cwd(), "data/seed/skills.json");
  const rolesPath = path.resolve(process.cwd(), "data/seed/roles.json");

  const skills = z
    .array(SkillSeedSchema)
    .parse(JSON.parse(fs.readFileSync(skillsPath, "utf8")));
  const roles = z
    .array(RoleSeedSchema)
    .parse(JSON.parse(fs.readFileSync(rolesPath, "utf8")));

  it("contains 180 to 220 skills with unique names", () => {
    expect(skills.length).toBeGreaterThanOrEqual(180);
    expect(skills.length).toBeLessThanOrEqual(220);

    const names = skills.map((s) => s.name.toLowerCase());
    expect(new Set(names).size).toBe(skills.length);
  });

  it("has lowercase aliases that are unique across all skills", () => {
    const seenAliases = new Map<string, string>();

    for (const skill of skills) {
      const ownLower = skill.name.toLowerCase();
      const existingOwn = seenAliases.get(ownLower);
      expect(
        existingOwn,
        `Skill name "${ownLower}" collides with alias on "${existingOwn}"`
      ).toBeUndefined();
      seenAliases.set(ownLower, skill.name);

      for (const alias of skill.aliases) {
        expect(alias).toBe(alias.toLowerCase());
        if (alias === ownLower) continue;
        const existing = seenAliases.get(alias);
        expect(
          existing,
          `Duplicate alias "${alias}" on "${skill.name}" (already on "${existing}")`
        ).toBeUndefined();
        seenAliases.set(alias, skill.name);
      }
    }
  });

  it("defines 10 roles whose skills all exist in skills.json", () => {
    expect(roles.length).toBe(10);
    const skillNames = new Set(skills.map((s) => s.name));

    for (const role of roles) {
      if (role.name === "Other") {
        expect(role.skills).toHaveLength(0);
      } else {
        expect(role.skills.length).toBeGreaterThanOrEqual(8);
        expect(role.skills.length).toBeLessThanOrEqual(15);
      }

      for (const rs of role.skills) {
        expect(
          skillNames.has(rs.name),
          `Role "${role.name}" references unknown skill "${rs.name}"`
        ).toBe(true);
      }
    }
  });
});
