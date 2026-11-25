import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import {
  AdminJobRolePatchSchema,
  AdminRoleSkillUpsertSchema,
  AdminUserPatchSchema,
} from "@/server/schemas";

export class AdminServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminServiceError";
    this.status = status;
  }
}

/**
 * Pure guard enforcing self-protection and last-admin invariants.
 */
export function validateUserAdminMutation(params: {
  actorUserId: string;
  targetUserId: string;
  targetCurrentRole: Role;
  adminCount: number;
  blocked?: boolean;
  role?: Role;
}): void {
  const {
    actorUserId,
    targetUserId,
    targetCurrentRole,
    adminCount,
    blocked,
    role,
  } = params;

  if (actorUserId === targetUserId) {
    if (blocked === true) {
      throw new AdminServiceError("You cannot block your own account", 400);
    }
    if (role === "STUDENT" && targetCurrentRole === "ADMIN") {
      throw new AdminServiceError("You cannot demote your own admin role", 400);
    }
  }

  if (
    targetCurrentRole === "ADMIN" &&
    role === "STUDENT" &&
    adminCount <= 1
  ) {
    throw new AdminServiceError(
      "Cannot demote the last remaining administrator",
      400
    );
  }
}

export async function getAdminOverview() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalUsers, students, blocked, jobs, assistantCallsLast24h] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { blocked: true } }),
      db.job.count(),
      db.assistantLog.count({
        where: { createdAt: { gte: since24h } },
      }),
    ]);

  return {
    totalUsers,
    students,
    blocked,
    jobs,
    assistantCallsLast24h,
  };
}

export async function listAdminUsers(q?: string) {
  const query = q?.trim();
  return db.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      blocked: true,
      createdAt: true,
    },
  });
}

export async function updateAdminUser(
  actorUserId: string,
  targetUserId: string,
  rawData: unknown
) {
  const data = AdminUserPatchSchema.parse(rawData);

  const [target, adminCount] = await Promise.all([
    db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, blocked: true },
    }),
    db.user.count({ where: { role: "ADMIN" } }),
  ]);

  if (!target) {
    throw new AdminServiceError("User not found", 404);
  }

  validateUserAdminMutation({
    actorUserId,
    targetUserId,
    targetCurrentRole: target.role,
    adminCount,
    blocked: data.blocked,
    role: data.role,
  });

  return db.user.update({
    where: { id: targetUserId },
    data: {
      ...(data.blocked !== undefined ? { blocked: data.blocked } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      blocked: true,
      createdAt: true,
    },
  });
}

export async function listAdminJobs(q?: string) {
  const query = q?.trim();
  return db.job.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      company: true,
      source: true,
      roleId: true,
      roleOverridden: true,
      role: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

export async function overrideJobRole(jobId: string, rawData: unknown) {
  const { roleId } = AdminJobRolePatchSchema.parse(rawData);

  const [job, role] = await Promise.all([
    db.job.findUnique({ where: { id: jobId }, select: { id: true } }),
    db.jobRole.findUnique({ where: { id: roleId }, select: { id: true } }),
  ]);

  if (!job) {
    throw new AdminServiceError("Job not found", 404);
  }
  if (!role) {
    throw new AdminServiceError("Role not found", 404);
  }

  return db.job.update({
    where: { id: jobId },
    data: { roleId, roleOverridden: true },
    select: {
      id: true,
      roleId: true,
      roleOverridden: true,
      role: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function listRolesWithSkills() {
  const roles = await db.jobRole.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      skills: {
        orderBy: [{ weight: "desc" }, { skill: { name: "asc" } }],
        select: {
          weight: true,
          skill: {
            select: { id: true, name: true, category: true },
          },
        },
      },
    },
  });

  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    skills: r.skills.map((rs) => ({
      skillId: rs.skill.id,
      name: rs.skill.name,
      category: rs.skill.category,
      weight: rs.weight,
    })),
  }));
}

export async function upsertRoleSkill(roleId: string, rawData: unknown) {
  const { skillId, weight } = AdminRoleSkillUpsertSchema.parse(rawData);

  const [role, skill] = await Promise.all([
    db.jobRole.findUnique({ where: { id: roleId }, select: { id: true } }),
    db.skill.findUnique({ where: { id: skillId }, select: { id: true } }),
  ]);

  if (!role) throw new AdminServiceError("Role not found", 404);
  if (!skill) throw new AdminServiceError("Skill not found", 404);

  const saved = await db.roleSkill.upsert({
    where: { roleId_skillId: { roleId, skillId } },
    create: { roleId, skillId, weight },
    update: { weight },
    select: {
      weight: true,
      skill: { select: { id: true, name: true, category: true } },
    },
  });

  return {
    skillId: saved.skill.id,
    name: saved.skill.name,
    category: saved.skill.category,
    weight: saved.weight,
  };
}

export async function removeRoleSkill(roleId: string, skillId: string) {
  await db.roleSkill.deleteMany({
    where: { roleId, skillId },
  });
  return { removed: true };
}
