import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import {
  AddSkillItemSchema,
  EducationItemSchema,
  SetTargetRoleSchema,
  SkillLevelSchema,
  UpdateProfileSchema,
  type AddSkillItemInput,
  type EducationItem,
  type SkillLevelInput,
} from "@/server/schemas";
import { getSkillMatcher } from "@/server/services/skillCache";

export class ProfileServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProfileServiceError";
    this.status = status;
  }
}

export function parseEducationJson(raw: unknown): EducationItem[] {
  const parsed = z.array(EducationItemSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/**
 * Pure helper to resolve skillId/name inputs into deduplicated { skillId, level }
 * entries and a list of unrecognized names/ids.
 */
export function resolveSkillAdditions(
  items: AddSkillItemInput[],
  normalizeName: (term: string) => string | null,
  validSkillIds: Set<string>
): {
  resolved: { skillId: string; level: SkillLevelInput }[];
  unrecognized: string[];
} {
  const bySkillId = new Map<string, SkillLevelInput>();
  const unrecognized: string[] = [];

  for (const item of items) {
    let targetSkillId: string | null = null;

    if (item.skillId && validSkillIds.has(item.skillId)) {
      targetSkillId = item.skillId;
    } else if (item.name) {
      const normalized = normalizeName(item.name);
      if (normalized && validSkillIds.has(normalized)) {
        targetSkillId = normalized;
      }
    }

    if (!targetSkillId) {
      unrecognized.push(item.name ?? item.skillId ?? "");
      continue;
    }

    bySkillId.set(targetSkillId, item.level);
  }

  return {
    resolved: Array.from(bySkillId.entries()).map(([skillId, level]) => ({
      skillId,
      level,
    })),
    unrecognized,
  };
}

export async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  });

  if (!user) {
    throw new ProfileServiceError("User not found", 404);
  }

  const profile = await db.profile.upsert({
    where: { userId },
    create: {
      userId,
      interests: [],
    },
    update: {},
    include: {
      targetRole: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return {
    user,
    profile: {
      id: profile.id,
      education: parseEducationJson(profile.education),
      experienceLevel: profile.experienceLevel,
      interests: profile.interests,
      targetRoleId: profile.targetRoleId,
      targetRole: profile.targetRole,
    },
  };
}

export async function updateProfile(userId: string, data: unknown) {
  const parsed = UpdateProfileSchema.parse(data);

  if (parsed.targetRoleId) {
    const roleExists = await db.jobRole.findUnique({
      where: { id: parsed.targetRoleId },
      select: { id: true },
    });
    if (!roleExists) {
      throw new ProfileServiceError("Target role not found", 404);
    }
  }

  const updateData: Prisma.ProfileUncheckedUpdateInput = {};
  if (parsed.education !== undefined) {
    updateData.education = parsed.education as Prisma.InputJsonValue;
  }
  if (parsed.experienceLevel !== undefined) {
    updateData.experienceLevel = parsed.experienceLevel;
  }
  if (parsed.interests !== undefined) {
    updateData.interests = parsed.interests;
  }
  if (parsed.targetRoleId !== undefined) {
    updateData.targetRoleId = parsed.targetRoleId;
  }

  const profile = await db.profile.upsert({
    where: { userId },
    create: {
      userId,
      education: (parsed.education ?? []) as Prisma.InputJsonValue,
      experienceLevel: parsed.experienceLevel ?? null,
      interests: parsed.interests ?? [],
      targetRoleId: parsed.targetRoleId ?? null,
    },
    update: updateData,
    include: {
      targetRole: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return {
    id: profile.id,
    education: parseEducationJson(profile.education),
    experienceLevel: profile.experienceLevel,
    interests: profile.interests,
    targetRoleId: profile.targetRoleId,
    targetRole: profile.targetRole,
  };
}

export async function listUserSkills(userId: string) {
  const rows = await db.userSkill.findMany({
    where: { userId },
    include: {
      skill: {
        select: { id: true, name: true, category: true },
      },
    },
    orderBy: [{ skill: { category: "asc" } }, { skill: { name: "asc" } }],
  });

  return rows.map((r) => ({
    skillId: r.skillId,
    level: r.level,
    name: r.skill.name,
    category: r.skill.category,
  }));
}

export async function addSkills(userId: string, rawItems: unknown) {
  const items = z.array(AddSkillItemSchema).min(1).max(50).parse(rawItems);
  const [matcher, allSkills] = await Promise.all([
    getSkillMatcher(),
    db.skill.findMany({ select: { id: true } }),
  ]);

  const validSkillIds = new Set(allSkills.map((s) => s.id));
  const { resolved, unrecognized } = resolveSkillAdditions(
    items,
    matcher.normalize,
    validSkillIds
  );

  if (resolved.length === 0) {
    return { added: [], unrecognized };
  }

  const upserted = await db.$transaction(
    resolved.map((item) =>
      db.userSkill.upsert({
        where: {
          userId_skillId: { userId, skillId: item.skillId },
        },
        create: {
          userId,
          skillId: item.skillId,
          level: item.level,
        },
        update: {
          level: item.level,
        },
        include: {
          skill: {
            select: { id: true, name: true, category: true },
          },
        },
      })
    )
  );

  return {
    added: upserted.map((r) => ({
      skillId: r.skillId,
      level: r.level,
      name: r.skill.name,
      category: r.skill.category,
    })),
    unrecognized,
  };
}

export async function updateSkillLevel(
  userId: string,
  skillId: string,
  rawLevel: unknown
) {
  const level = SkillLevelSchema.parse(rawLevel);
  const existing = await db.userSkill.findUnique({
    where: { userId_skillId: { userId, skillId } },
    select: { skillId: true },
  });

  if (!existing) {
    throw new ProfileServiceError("Skill not found in user profile", 404);
  }

  const updated = await db.userSkill.update({
    where: { userId_skillId: { userId, skillId } },
    data: { level },
    include: {
      skill: {
        select: { id: true, name: true, category: true },
      },
    },
  });

  return {
    skillId: updated.skillId,
    level: updated.level,
    name: updated.skill.name,
    category: updated.skill.category,
  };
}

export async function removeSkills(userId: string, rawSkillIds: unknown) {
  const skillIds = z.array(z.string().min(1)).min(1).max(50).parse(rawSkillIds);
  const result = await db.userSkill.deleteMany({
    where: {
      userId,
      skillId: { in: skillIds },
    },
  });

  return { removedCount: result.count };
}

export async function setTargetRole(userId: string, roleId: string | null) {
  const parsed = SetTargetRoleSchema.parse({ roleId });
  return updateProfile(userId, { targetRoleId: parsed.roleId });
}
