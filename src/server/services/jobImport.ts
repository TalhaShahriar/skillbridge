import crypto from "node:crypto";
import type { ExperienceLevel, WorkMode } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import {
  classifyRole,
  type RoleClassifierInput,
} from "@/server/services/roleClassifier";
import { getSkillMatcher } from "@/server/services/skillCache";
import type { SkillMatcher } from "@/server/services/skillMatcher";

export const MAX_DESCRIPTION_LENGTH = 8000;

export const ImportColumnMappingSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  description: z.string().min(1),
  skills: z.string().min(1).optional(),
  salaryMin: z.string().min(1).optional(),
  salaryMax: z.string().min(1).optional(),
  salaryCurrency: z.string().min(1).optional(),
  workMode: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  postedAt: z.string().min(1).optional(),
  sourceUrl: z.string().min(1).optional(),
  externalId: z.string().min(1).optional(),
});

export type ImportColumnMapping = z.infer<typeof ImportColumnMappingSchema>;

export interface PreparedJob {
  title: string;
  company: string | null;
  location: string | null;
  workMode: WorkMode;
  level: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string;
  postedAt: Date | null;
  source: string;
  sourceUrl: string | null;
  externalId: string;
  roleId: string;
  roleSlug: string;
  skillIds: string[];
}

export type PrepareRowResult =
  | { status: "ok"; job: PreparedJob }
  | { status: "invalid" }
  | { status: "non_tech" };

export interface ImportSummary {
  read: number;
  imported: number;
  skippedNonTech: number;
  skippedInvalid: number;
  perRole: Record<string, number>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function inferWorkMode(
  rawWorkMode?: string | null,
  contextText?: string | null
): WorkMode {
  const combined = `${rawWorkMode ?? ""} ${contextText ?? ""}`.toLowerCase();
  if (/\b(remote|wfh|work from home|telecommute)\b/.test(combined)) {
    return "REMOTE";
  }
  if (/\bhybrid\b/.test(combined)) {
    return "HYBRID";
  }
  if (/\b(onsite|on-site|on site|in-office|in office)\b/.test(combined)) {
    return "ONSITE";
  }
  return "UNKNOWN";
}

export function inferExperienceLevel(
  rawLevel?: string | null,
  title?: string | null
): ExperienceLevel {
  const combined = `${rawLevel ?? ""} ${title ?? ""}`.toLowerCase();
  if (/\b(intern|internship|trainee)\b/.test(combined)) {
    return "INTERN";
  }
  if (/\b(junior|jr\.?|entry|entry-level|fresher|associate|graduate)\b/.test(combined)) {
    return "ENTRY";
  }
  if (/\b(senior|sr\.?|lead|principal|staff|architect)\b/.test(combined)) {
    return "SENIOR";
  }
  if (/\b(mid|mid-level|intermediate)\b/.test(combined)) {
    return "MID";
  }
  return "UNKNOWN";
}

export function parseSalaryNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
}

export function parsePostedAt(value: unknown): Date | null {
  const str = asNonEmptyString(value);
  if (!str) return null;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function splitCsvSkills(rawSkills: string | null | undefined): string[] {
  if (!rawSkills) return [];
  const cleaned = rawSkills.replace(/^\[|\]$/g, "");
  return cleaned
    .split(/[,;|]/)
    .map((part) => part.replace(/^['"\s]+|['"\s]+$/g, ""))
    .filter((part) => part.length > 0);
}

export function generateExternalId(
  title: string,
  company: string | null,
  description: string
): string {
  const payload = `${title.toLowerCase()}|${(company ?? "").toLowerCase()}|${description.slice(0, 500)}`;
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

function getMappedField(
  row: Record<string, unknown>,
  mappedKey: string | undefined,
  fallbackKey: string
): unknown {
  if (mappedKey && mappedKey in row) {
    return row[mappedKey];
  }
  return row[fallbackKey];
}

export function prepareJobRow(
  row: Record<string, unknown>,
  options: {
    source: string;
    config?: ImportColumnMapping;
    matcher: SkillMatcher;
    roles: RoleClassifierInput[];
  }
): PrepareRowResult {
  const { source, config, matcher, roles } = options;

  const title = asNonEmptyString(getMappedField(row, config?.title, "title"));
  const rawDescription = asNonEmptyString(
    getMappedField(row, config?.description, "description")
  );

  if (!title || !rawDescription) {
    return { status: "invalid" };
  }

  const description = rawDescription.slice(0, MAX_DESCRIPTION_LENGTH);
  const company = asNonEmptyString(
    getMappedField(row, config?.company, "company")
  );
  const location = asNonEmptyString(
    getMappedField(row, config?.location, "location")
  );

  const otherRole = roles.find((r) => r.slug === "other");
  if (!otherRole) {
    throw new Error('Missing "other" role in roles list');
  }

  const roleId = classifyRole(title, roles);
  const matchedRole = roles.find((r) => r.id === roleId) ?? otherRole;

  const rawSkills = asNonEmptyString(
    getMappedField(row, config?.skills, "skills")
  );
  const csvSkillIds = splitCsvSkills(rawSkills)
    .map((term) => matcher.normalize(term))
    .filter((id): id is string => id !== null);
  const extractedSkillIds = matcher.extract(`${title}\n${description}`);
  const skillIds = Array.from(new Set([...csvSkillIds, ...extractedSkillIds]));

  // Keep only tech/data jobs: matched a specialized role OR extracted >= 3 tech skills
  if (roleId === otherRole.id && skillIds.length < 3) {
    return { status: "non_tech" };
  }

  const rawWorkMode = asNonEmptyString(
    getMappedField(row, config?.workMode, "workMode")
  );
  const rawLevel = asNonEmptyString(
    getMappedField(row, config?.level, "level")
  );

  const externalId =
    asNonEmptyString(getMappedField(row, config?.externalId, "externalId")) ??
    generateExternalId(title, company, description);

  return {
    status: "ok",
    job: {
      title,
      company,
      location,
      workMode: inferWorkMode(rawWorkMode, `${title} ${location ?? ""} ${description.slice(0, 400)}`),
      level: inferExperienceLevel(rawLevel, title),
      salaryMin: parseSalaryNumber(
        getMappedField(row, config?.salaryMin, "salaryMin")
      ),
      salaryMax: parseSalaryNumber(
        getMappedField(row, config?.salaryMax, "salaryMax")
      ),
      salaryCurrency: asNonEmptyString(
        getMappedField(row, config?.salaryCurrency, "salaryCurrency")
      ),
      description,
      postedAt: parsePostedAt(
        getMappedField(row, config?.postedAt, "postedAt")
      ),
      source,
      sourceUrl: asNonEmptyString(
        getMappedField(row, config?.sourceUrl, "sourceUrl")
      ),
      externalId,
      roleId,
      roleSlug: matchedRole.slug,
      skillIds,
    },
  };
}

export async function importJobs(
  rows: AsyncIterable<Record<string, unknown>> | Iterable<Record<string, unknown>>,
  options: {
    source: string;
    limit?: number;
    perRoleCap?: number;
    config?: ImportColumnMapping;
  }
): Promise<ImportSummary> {
  const { source, limit, config } = options;
  const [roles, matcher] = await Promise.all([
    db.jobRole.findMany({
      select: { id: true, slug: true, titleKeywords: true },
    }),
    getSkillMatcher(),
  ]);

  const perRoleCap =
    options.perRoleCap ??
    (limit ? Math.max(10, Math.ceil(limit / Math.max(1, roles.length - 1))) : undefined);

  const summary: ImportSummary = {
    read: 0,
    imported: 0,
    skippedNonTech: 0,
    skippedInvalid: 0,
    perRole: {},
  };

  const accepted: PreparedJob[] = [];

  for await (const row of rows) {
    summary.read++;

    const prepared = prepareJobRow(row, {
      source,
      config,
      matcher,
      roles,
    });

    if (prepared.status === "invalid") {
      summary.skippedInvalid++;
      continue;
    }
    if (prepared.status === "non_tech") {
      summary.skippedNonTech++;
      continue;
    }

    const roleSlug = prepared.job.roleSlug;
    const currentRoleCount = summary.perRole[roleSlug] ?? 0;

    if (perRoleCap !== undefined && currentRoleCount >= perRoleCap) {
      continue;
    }

    accepted.push(prepared.job);
    summary.perRole[roleSlug] = currentRoleCount + 1;

    if (limit !== undefined && accepted.length >= limit) {
      break;
    }
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < accepted.length; i += CHUNK_SIZE) {
    const chunk = accepted.slice(i, i + CHUNK_SIZE);
    const existing = await db.job.findMany({
      where: {
        source,
        externalId: { in: chunk.map((j) => j.externalId) },
      },
      select: { id: true, externalId: true, roleOverridden: true },
    });
    const existingByExtId = new Map(
      existing.map((e) => [e.externalId, e])
    );

    const savedJobs = await db.$transaction(
      chunk.map((job) => {
        const prev = existingByExtId.get(job.externalId);
        return db.job.upsert({
          where: {
            source_externalId: {
              source: job.source,
              externalId: job.externalId,
            },
          },
          create: {
            title: job.title,
            company: job.company,
            location: job.location,
            workMode: job.workMode,
            level: job.level,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            description: job.description,
            postedAt: job.postedAt,
            source: job.source,
            sourceUrl: job.sourceUrl,
            externalId: job.externalId,
            roleId: job.roleId,
          },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            workMode: job.workMode,
            level: job.level,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            description: job.description,
            postedAt: job.postedAt,
            sourceUrl: job.sourceUrl,
            ...(prev?.roleOverridden ? {} : { roleId: job.roleId }),
          },
          select: { id: true, externalId: true },
        });
      })
    );

    const jobIds = savedJobs.map((j) => j.id);
    const jobIdByExtId = new Map(savedJobs.map((j) => [j.externalId, j.id]));

    await db.jobSkill.deleteMany({
      where: { jobId: { in: jobIds } },
    });

    const jobSkillRows = chunk.flatMap((job) => {
      const jobId = jobIdByExtId.get(job.externalId);
      if (!jobId) return [];
      return job.skillIds.map((skillId) => ({ jobId, skillId }));
    });

    if (jobSkillRows.length > 0) {
      await db.jobSkill.createMany({
        data: jobSkillRows,
        skipDuplicates: true,
      });
    }

    summary.imported += savedJobs.length;
  }

  return summary;
}

export async function retagAllJobs(): Promise<{
  processed: number;
  updatedRoles: number;
  totalSkillLinks: number;
}> {
  const [roles, matcher] = await Promise.all([
    db.jobRole.findMany({
      select: { id: true, slug: true, titleKeywords: true },
    }),
    getSkillMatcher(),
  ]);

  let processed = 0;
  let updatedRoles = 0;
  let totalSkillLinks = 0;
  let cursor: string | undefined;

  const BATCH_SIZE = 100;

  while (true) {
    const jobs = await db.job.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        roleId: true,
        roleOverridden: true,
      },
    });

    if (jobs.length === 0) break;

    const roleUpdates = [];
    const skillRows: { jobId: string; skillId: string }[] = [];

    for (const job of jobs) {
      const newRoleId = classifyRole(job.title, roles);
      if (!job.roleOverridden && newRoleId !== job.roleId) {
        roleUpdates.push(
          db.job.update({
            where: { id: job.id },
            data: { roleId: newRoleId },
          })
        );
        updatedRoles++;
      }

      const skillIds = matcher.extract(`${job.title}\n${job.description}`);
      for (const skillId of skillIds) {
        skillRows.push({ jobId: job.id, skillId });
      }
    }

    if (roleUpdates.length > 0) {
      await db.$transaction(roleUpdates);
    }

    await db.jobSkill.deleteMany({
      where: { jobId: { in: jobs.map((j) => j.id) } },
    });

    if (skillRows.length > 0) {
      await db.jobSkill.createMany({
        data: skillRows,
        skipDuplicates: true,
      });
      totalSkillLinks += skillRows.length;
    }

    processed += jobs.length;
    cursor = jobs[jobs.length - 1].id;
  }

  return { processed, updatedRoles, totalSkillLinks };
}
