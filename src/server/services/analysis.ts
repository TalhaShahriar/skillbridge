import { db } from "@/server/db";

export interface RoleSkillInput {
  skillId: string;
  name: string;
  category: string;
  weight: number;
}

export interface SkillGapResult {
  readinessPct: number;
  matched: RoleSkillInput[];
  missing: RoleSkillInput[];
  totalWeight: number;
  matchedWeight: number;
}

export interface JobScoreResult {
  matchPct: number;
  matching: string[];
  missing: string[];
  totalWeight: number;
  matchedWeight: number;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Pure computation of readiness % and matched/missing skills for a target role.
 */
export function computeSkillGap(
  userSkillIds: Iterable<string>,
  roleSkills: RoleSkillInput[]
): SkillGapResult {
  const userSet = new Set(userSkillIds);
  const matched: RoleSkillInput[] = [];
  const missing: RoleSkillInput[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const rs of roleSkills) {
    const w = Math.max(0, rs.weight);
    totalWeight += w;
    if (userSet.has(rs.skillId)) {
      matchedWeight += w;
      matched.push(rs);
    } else {
      missing.push(rs);
    }
  }

  matched.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  missing.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));

  const readinessPct =
    totalWeight <= 0 ? 0 : roundOneDecimal((matchedWeight / totalWeight) * 100);

  return {
    readinessPct,
    matched,
    missing,
    totalWeight,
    matchedWeight,
  };
}

/**
 * Pure computation of job match % using weights from the target role's RoleSkill
 * (defaulting to weight 1 for skills not in the target role).
 */
export function scoreJob(
  jobSkillIds: string[],
  userSkillIds: Iterable<string>,
  weightMap: Map<string, number>
): JobScoreResult {
  if (jobSkillIds.length === 0) {
    return {
      matchPct: 0,
      matching: [],
      missing: [],
      totalWeight: 0,
      matchedWeight: 0,
    };
  }

  const userSet = new Set(userSkillIds);
  const uniqueJobSkills = Array.from(new Set(jobSkillIds));
  const matching: string[] = [];
  const missing: string[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const skillId of uniqueJobSkills) {
    const w = Math.max(0, weightMap.get(skillId) ?? 1);
    totalWeight += w;
    if (userSet.has(skillId)) {
      matchedWeight += w;
      matching.push(skillId);
    } else {
      missing.push(skillId);
    }
  }

  const matchPct =
    totalWeight <= 0 ? 0 : roundOneDecimal((matchedWeight / totalWeight) * 100);

  return {
    matchPct,
    matching,
    missing,
    totalWeight,
    matchedWeight,
  };
}

/**
 * Returns % of jobs in `roleId` that mention each skillId (0-100, 1 decimal).
 */
export async function demandForRole(
  roleId: string
): Promise<Record<string, number>> {
  const [totalJobs, grouped] = await Promise.all([
    db.job.count({ where: { roleId } }),
    db.jobSkill.groupBy({
      by: ["skillId"],
      where: { job: { roleId } },
      _count: { skillId: true },
    }),
  ]);

  if (totalJobs === 0) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const row of grouped) {
    result[row.skillId] = roundOneDecimal(
      (row._count.skillId / totalJobs) * 100
    );
  }
  return result;
}

export async function getSkillGapForUser(userId: string) {
  const [profile, userSkills] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: {
        targetRoleId: true,
        targetRole: {
          select: { id: true, name: true, slug: true, description: true },
        },
      },
    }),
    db.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    }),
  ]);

  const userSkillIds = userSkills.map((s) => s.skillId);

  if (!profile?.targetRoleId || !profile.targetRole) {
    return {
      hasTargetRole: false,
      targetRole: null,
      userSkillCount: userSkillIds.length,
      gap: null,
      demandBySkillId: {} as Record<string, number>,
    };
  }

  const [roleSkillsRows, demandBySkillId] = await Promise.all([
    db.roleSkill.findMany({
      where: { roleId: profile.targetRoleId },
      include: {
        skill: { select: { id: true, name: true, category: true } },
      },
    }),
    demandForRole(profile.targetRoleId),
  ]);

  const roleSkills: RoleSkillInput[] = roleSkillsRows.map((rs) => ({
    skillId: rs.skillId,
    name: rs.skill.name,
    category: rs.skill.category,
    weight: rs.weight,
  }));

  const gap = computeSkillGap(userSkillIds, roleSkills);

  return {
    hasTargetRole: true,
    targetRole: profile.targetRole,
    userSkillCount: userSkillIds.length,
    gap,
    demandBySkillId,
  };
}

export async function recommendJobs(
  userId: string,
  options?: { limit?: number; roleOnly?: boolean }
) {
  const limit = Math.min(Math.max(1, options?.limit ?? 20), 100);
  const roleOnly = options?.roleOnly ?? true;

  const [profile, userSkills] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: {
        targetRoleId: true,
        targetRole: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    }),
  ]);

  const userSkillIds = userSkills.map((s) => s.skillId);
  if (userSkillIds.length === 0) {
    return {
      hasSkills: false,
      targetRole: profile?.targetRole ?? null,
      jobs: [],
    };
  }

  const weightMap = new Map<string, number>();
  if (profile?.targetRoleId) {
    const roleSkills = await db.roleSkill.findMany({
      where: { roleId: profile.targetRoleId },
      select: { skillId: true, weight: true },
    });
    for (const rs of roleSkills) {
      weightMap.set(rs.skillId, rs.weight);
    }
  }

  const candidates = await db.job.findMany({
    where:
      roleOnly && profile?.targetRoleId
        ? { roleId: profile.targetRoleId }
        : undefined,
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    take: 1000,
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      workMode: true,
      level: true,
      postedAt: true,
      source: true,
      role: {
        select: { id: true, name: true, slug: true },
      },
      skills: {
        select: {
          skillId: true,
          skill: {
            select: { id: true, name: true, category: true },
          },
        },
      },
    },
  });

  const scored = candidates.map((job) => {
    const skillById = new Map(
      job.skills.map((js) => [js.skillId, js.skill])
    );
    const result = scoreJob(
      job.skills.map((js) => js.skillId),
      userSkillIds,
      weightMap
    );

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      level: job.level,
      postedAt: job.postedAt,
      source: job.source,
      role: job.role,
      matchPct: result.matchPct,
      matching: result.matching
        .map((id) => skillById.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
      missing: result.missing
        .map((id) => skillById.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    };
  });

  scored.sort((a, b) => {
    if (b.matchPct !== a.matchPct) return b.matchPct - a.matchPct;
    const ta = a.postedAt ? a.postedAt.getTime() : 0;
    const tb = b.postedAt ? b.postedAt.getTime() : 0;
    return tb - ta;
  });

  return {
    hasSkills: true,
    targetRole: profile?.targetRole ?? null,
    jobs: scored.slice(0, limit),
  };
}
