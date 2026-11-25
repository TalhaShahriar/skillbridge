import { db } from "@/server/db";

export interface TopSkillItem {
  skillId: string;
  name: string;
  category: string;
  count: number;
  pct: number;
}

export interface RoleCountItem {
  roleId: string;
  name: string;
  slug: string;
  count: number;
}

export interface SplitItem {
  name: string;
  value: number;
}

export interface CategoryTopSkills {
  category: string;
  skills: TopSkillItem[];
}

export interface DashboardData {
  totals: {
    jobs: number;
    skillsTracked: number;
    roles: number;
    datasetJobs: number;
    manualBdJobs: number;
    sampleJobs: number;
    datasetName: string;
    datasetUrl: string | null;
  };
  selectedRoleId: string | null;
  selectedRoleName: string | null;
  scopeJobCount: number;
  topSkills: TopSkillItem[];
  jobsByRole: RoleCountItem[];
  workModeSplit: SplitItem[];
  levelSplit: SplitItem[];
  topSkillsByCategory: CategoryTopSkills[];
  roles: { id: string; name: string; slug: string }[];
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatEnumLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export async function getDashboardData(
  roleId?: string
): Promise<DashboardData> {
  const datasetName = process.env.DATASET_NAME?.trim() || "Job Dataset";
  const datasetUrl = process.env.DATASET_URL?.trim() || null;

  const [
    totalJobs,
    skillsTracked,
    rolesList,
    sourceGroups,
    roleGroups,
    workModeGroups,
    levelGroups,
    allSkills,
    jobSkillGroups,
    scopeJobCount,
  ] = await Promise.all([
    db.job.count(),
    db.skill.count(),
    db.jobRole.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    db.job.groupBy({
      by: ["source"],
      _count: { id: true },
    }),
    db.job.groupBy({
      by: ["roleId"],
      _count: { id: true },
    }),
    db.job.groupBy({
      by: ["workMode"],
      _count: { id: true },
    }),
    db.job.groupBy({
      by: ["level"],
      _count: { id: true },
    }),
    db.skill.findMany({
      select: { id: true, name: true, category: true },
    }),
    db.jobSkill.groupBy({
      by: ["skillId"],
      where: roleId ? { job: { roleId } } : undefined,
      _count: { skillId: true },
      orderBy: { _count: { skillId: "desc" } },
    }),
    roleId ? db.job.count({ where: { roleId } }) : db.job.count(),
  ]);

  let manualBdJobs = 0;
  let sampleJobs = 0;
  let datasetJobs = 0;
  for (const g of sourceGroups) {
    if (g.source === "manual-bd") {
      manualBdJobs += g._count.id;
    } else if (g.source === "sample") {
      sampleJobs += g._count.id;
    } else {
      datasetJobs += g._count.id;
    }
  }

  const roleById = new Map(rolesList.map((r) => [r.id, r]));
  const selectedRole = roleId ? roleById.get(roleId) ?? null : null;

  const jobsByRole: RoleCountItem[] = roleGroups
    .map((g) => {
      const role = g.roleId ? roleById.get(g.roleId) : null;
      return {
        roleId: g.roleId ?? "other",
        name: role?.name ?? "Other",
        slug: role?.slug ?? "other",
        count: g._count.id,
      };
    })
    .sort((a, b) => b.count - a.count);

  const workModeSplit: SplitItem[] = workModeGroups
    .map((g) => ({
      name: formatEnumLabel(g.workMode),
      value: g._count.id,
    }))
    .sort((a, b) => b.value - a.value);

  const levelSplit: SplitItem[] = levelGroups
    .map((g) => ({
      name: formatEnumLabel(g.level),
      value: g._count.id,
    }))
    .sort((a, b) => b.value - a.value);

  const skillById = new Map(allSkills.map((s) => [s.id, s]));

  const rankedSkills: TopSkillItem[] = [];
  for (const g of jobSkillGroups) {
    const skill = skillById.get(g.skillId);
    if (!skill) continue;
    const count = g._count.skillId;
    rankedSkills.push({
      skillId: g.skillId,
      name: skill.name,
      category: skill.category,
      count,
      pct: scopeJobCount > 0 ? roundOneDecimal((count / scopeJobCount) * 100) : 0,
    });
  }

  const topSkills = rankedSkills.slice(0, 15);

  const categoryMap = new Map<string, TopSkillItem[]>();
  for (const item of rankedSkills) {
    const list = categoryMap.get(item.category) ?? [];
    if (list.length < 5) {
      list.push(item);
      categoryMap.set(item.category, list);
    }
  }

  const topSkillsByCategory: CategoryTopSkills[] = Array.from(
    categoryMap.entries()
  )
    .map(([category, skills]) => ({ category, skills }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return {
    totals: {
      jobs: totalJobs,
      skillsTracked,
      roles: rolesList.length,
      datasetJobs,
      manualBdJobs,
      sampleJobs,
      datasetName,
      datasetUrl,
    },
    selectedRoleId: selectedRole?.id ?? null,
    selectedRoleName: selectedRole?.name ?? null,
    scopeJobCount,
    topSkills,
    jobsByRole,
    workModeSplit,
    levelSplit,
    topSkillsByCategory,
    roles: rolesList,
  };
}
