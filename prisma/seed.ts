import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const SkillSeedSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  ambiguous: z.boolean().optional(),
});

const RoleSkillSeedSchema = z.object({
  name: z.string().min(1),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const RoleSeedSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  titleKeywords: z.array(z.string().min(1)),
  skills: z.array(RoleSkillSeedSchema),
});

const SkillsFileSchema = z.array(SkillSeedSchema).min(1);
const RolesFileSchema = z.array(RoleSeedSchema).min(1);

async function main() {
  const skillsPath = path.resolve(process.cwd(), "data/seed/skills.json");
  const rolesPath = path.resolve(process.cwd(), "data/seed/roles.json");

  const skillsRaw = JSON.parse(fs.readFileSync(skillsPath, "utf8"));
  const rolesRaw = JSON.parse(fs.readFileSync(rolesPath, "utf8"));

  const skills = SkillsFileSchema.parse(skillsRaw);
  const roles = RolesFileSchema.parse(rolesRaw);

  const skillNameMap = new Map<string, string>();
  const aliasOwnerMap = new Map<string, string>();

  for (const skill of skills) {
    const key = skill.name.toLowerCase();
    if (skillNameMap.has(key)) {
      throw new Error(`Duplicate skill name: "${skill.name}"`);
    }
    skillNameMap.set(key, skill.name);

    const allAliases = new Set([
      key,
      ...skill.aliases.map((a) => a.toLowerCase()),
    ]);
    for (const alias of allAliases) {
      const owner = aliasOwnerMap.get(alias);
      if (owner && owner !== skill.name) {
        throw new Error(
          `Alias collision for "${alias}": used by both "${owner}" and "${skill.name}"`
        );
      }
      aliasOwnerMap.set(alias, skill.name);
    }
  }

  for (const role of roles) {
    for (const rs of role.skills) {
      if (!skillNameMap.has(rs.name.toLowerCase())) {
        throw new Error(
          `Role "${role.name}" references unknown skill "${rs.name}"`
        );
      }
    }
  }

  const prisma = new PrismaClient();

  try {
    const dbSkillByName = new Map<string, string>();
    let aliasCount = 0;

    for (const skill of skills) {
      const savedSkill = await prisma.skill.upsert({
        where: { name: skill.name },
        create: { name: skill.name, category: skill.category },
        update: { category: skill.category },
      });
      dbSkillByName.set(skill.name.toLowerCase(), savedSkill.id);

      const aliasesToUpsert = Array.from(
        new Set([
          skill.name.toLowerCase(),
          ...skill.aliases.map((a) => a.toLowerCase()),
        ])
      );

      for (const alias of aliasesToUpsert) {
        await prisma.skillAlias.upsert({
          where: { alias },
          create: { alias, skillId: savedSkill.id },
          update: { skillId: savedSkill.id },
        });
        aliasCount++;
      }
    }

    let roleSkillCount = 0;
    for (const role of roles) {
      const savedRole = await prisma.jobRole.upsert({
        where: { slug: role.slug },
        create: {
          name: role.name,
          slug: role.slug,
          description: role.description,
          titleKeywords: role.titleKeywords,
        },
        update: {
          name: role.name,
          description: role.description,
          titleKeywords: role.titleKeywords,
        },
      });

      for (const rs of role.skills) {
        const skillId = dbSkillByName.get(rs.name.toLowerCase());
        if (!skillId) {
          throw new Error(`Missing skill ID for "${rs.name}"`);
        }
        await prisma.roleSkill.upsert({
          where: {
            roleId_skillId: {
              roleId: savedRole.id,
              skillId,
            },
          },
          create: {
            roleId: savedRole.id,
            skillId,
            weight: rs.weight,
          },
          update: {
            weight: rs.weight,
          },
        });
        roleSkillCount++;
      }
    }

    console.log(
      `Seeded ${skills.length} skills, ${aliasCount} aliases, ${roles.length} roles, and ${roleSkillCount} role-skill weights.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
