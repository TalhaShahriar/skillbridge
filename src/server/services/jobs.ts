import type { ExperienceLevel, Prisma, WorkMode } from "@prisma/client";
import { formatJobSourceLabel } from "@/lib/format";
import { db } from "@/server/db";
import { scoreJob } from "@/server/services/analysis";

export { formatJobSourceLabel };

export interface ListJobsParams {
  q?: string;
  roleId?: string;
  workMode?: WorkMode;
  level?: ExperienceLevel;
  page?: number;
  pageSize?: number;
}

export function getDatasetName(): string {
  return process.env.DATASET_NAME?.trim() || "Job Dataset";
}

export async function listJobs(params: ListJobsParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 50);
  const q = params.q?.trim();

  if (!process.env.DATABASE_URL) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      datasetName: getDatasetName(),
    };
  }

  const where: Prisma.JobWhereInput = {
    ...(params.roleId ? { roleId: params.roleId } : {}),
    ...(params.workMode ? { workMode: params.workMode } : {}),
    ...(params.level ? { level: params.level } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            {
              skills: {
                some: {
                  skill: {
                    name: { contains: q, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        workMode: true,
        level: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        postedAt: true,
        source: true,
        sourceUrl: true,
        role: {
          select: { id: true, name: true, slug: true },
        },
        skills: {
          select: {
            skill: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
    }),
  ]);

  const items = rows.map((row) => ({
    ...row,
    skills: row.skills.map((s) => s.skill),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    datasetName: getDatasetName(),
  };
}

export async function getJob(id: string) {
  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      workMode: true,
      level: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      description: true,
      postedAt: true,
      source: true,
      sourceUrl: true,
      role: {
        select: { id: true, name: true, slug: true },
      },
      skills: {
        select: {
          skill: {
            select: { id: true, name: true, category: true },
          },
        },
      },
    },
  });

  if (!job) return null;

  return {
    ...job,
    skills: job.skills.map((s) => s.skill),
  };
}

export async function getJobWithMatchForUser(
  id: string,
  userId: string | null
) {
  const job = await getJob(id);
  if (!job) return null;

  const datasetName = getDatasetName();

  if (!userId) {
    return { job, match: null, datasetName };
  }

  const [userSkills, profile] = await Promise.all([
    db.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    }),
    db.profile.findUnique({
      where: { userId },
      select: { targetRoleId: true },
    }),
  ]);

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

  const scored = scoreJob(
    job.skills.map((s) => s.id),
    userSkills.map((s) => s.skillId),
    weightMap
  );

  const skillById = new Map(job.skills.map((s) => [s.id, s]));

  return {
    job,
    datasetName,
    match: {
      matchPct: scored.matchPct,
      matching: scored.matching
        .map((sid) => skillById.get(sid))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
      missing: scored.missing
        .map((sid) => skillById.get(sid))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
      hasUserSkills: userSkills.length > 0,
    },
  };
}
