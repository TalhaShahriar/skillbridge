import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMatcher } from "@/server/services/skillMatcher";
import {
  generateExternalId,
  inferExperienceLevel,
  inferWorkMode,
  MAX_DESCRIPTION_LENGTH,
  prepareJobRow,
  splitCsvSkills,
  type ImportColumnMapping,
} from "@/server/services/jobImport";
import type { RoleClassifierInput } from "@/server/services/roleClassifier";

const rawSkills = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "data/seed/skills.json"), "utf8")
) as { name: string; aliases: string[]; ambiguous?: boolean }[];

const rawRoles = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "data/seed/roles.json"), "utf8")
) as { slug: string; titleKeywords: string[] }[];

const matcher = buildMatcher(
  rawSkills.map((s) => ({
    id: s.name,
    name: s.name,
    aliases: s.aliases,
    ambiguous: s.ambiguous,
  }))
);

const roles: RoleClassifierInput[] = rawRoles.map((r) => ({
  id: r.slug,
  slug: r.slug,
  titleKeywords: r.titleKeywords,
}));

const csvConfig: ImportColumnMapping = {
  title: "job_title",
  company: "company_name",
  location: "job_location",
  description: "job_desc",
  skills: "job_skills",
  salaryMin: "min_sal",
  salaryMax: "max_sal",
  workMode: "remote_type",
  level: "exp_level",
  postedAt: "date_posted",
  externalId: "job_id",
};

describe("jobImport row mapping and filtering", () => {
  it("skips rows missing title or description", () => {
    expect(
      prepareJobRow(
        { job_title: "", job_desc: "Some description" },
        { source: "kaggle:test", config: csvConfig, matcher, roles }
      )
    ).toEqual({ status: "invalid" });

    expect(
      prepareJobRow(
        { job_title: "Backend Developer", job_desc: "   " },
        { source: "kaggle:test", config: csvConfig, matcher, roles }
      )
    ).toEqual({ status: "invalid" });
  });

  it("filters out non-tech jobs with Other role and fewer than 3 extracted skills", () => {
    const result = prepareJobRow(
      {
        job_title: "Office Receptionist",
        job_desc: "Greet visitors, answer phone calls, and schedule meetings.",
      },
      { source: "kaggle:test", config: csvConfig, matcher, roles }
    );
    expect(result).toEqual({ status: "non_tech" });
  });

  it("keeps Other-role jobs if >= 3 tech skills are extracted", () => {
    const result = prepareJobRow(
      {
        job_title: "Data Engineer",
        job_desc:
          "Build ETL pipelines using Python, SQL, Spark, Airflow, and AWS.",
      },
      { source: "kaggle:test", config: csvConfig, matcher, roles }
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.job.roleId).toBe("other");
      expect(result.job.skillIds).toEqual(
        expect.arrayContaining(["Python", "SQL", "Spark", "Airflow", "AWS"])
      );
    }
  });

  it("maps CSV columns, merges normalized CSV skills + extracted skills, and trims description", () => {
    const longDesc = `Build APIs with Node.js and PostgreSQL. ${"x".repeat(9000)}`;
    const result = prepareJobRow(
      {
        job_id: "ext-42",
        job_title: "Senior Backend Developer",
        company_name: "Acme Tech",
        job_location: "Dhaka (Remote)",
        job_desc: longDesc,
        job_skills: "['k8s', 'postgres', 'unknown_tool_xyz']",
        min_sal: "80000",
        max_sal: "120000",
        date_posted: "2026-11-15",
      },
      { source: "kaggle:test", config: csvConfig, matcher, roles }
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.job.externalId).toBe("ext-42");
      expect(result.job.roleId).toBe("backend-developer");
      expect(result.job.level).toBe("SENIOR");
      expect(result.job.workMode).toBe("REMOTE");
      expect(result.job.salaryMin).toBe(80000);
      expect(result.job.salaryMax).toBe(120000);
      expect(result.job.description.length).toBe(MAX_DESCRIPTION_LENGTH);
      expect(result.job.skillIds).toEqual(
        expect.arrayContaining(["Kubernetes", "PostgreSQL", "Node.js"])
      );
    }
  });

  it("generates deterministic externalId when absent", () => {
    const id1 = generateExternalId("Dev", "Co", "Desc");
    const id2 = generateExternalId("dev", "co", "Desc");
    const id3 = generateExternalId("Dev", "OtherCo", "Desc");
    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toHaveLength(24);
  });

  it("infers workMode and experience level from text", () => {
    expect(inferWorkMode(null, "Hybrid role in Dhaka")).toBe("HYBRID");
    expect(inferWorkMode("Work from home", "")).toBe("REMOTE");
    expect(inferWorkMode(null, "On-site office role")).toBe("ONSITE");
    expect(inferWorkMode(null, "No mention")).toBe("UNKNOWN");

    expect(inferExperienceLevel(null, "Frontend Intern")).toBe("INTERN");
    expect(inferExperienceLevel(null, "Junior QA Engineer")).toBe("ENTRY");
    expect(inferExperienceLevel(null, "Senior DevOps Engineer")).toBe("SENIOR");
    expect(inferExperienceLevel("Mid-level", "Developer")).toBe("MID");
  });

  it("splits CSV skills from comma or Python-list strings", () => {
    expect(splitCsvSkills("['Python', 'SQL', 'Power BI']")).toEqual([
      "Python",
      "SQL",
      "Power BI",
    ]);
    expect(splitCsvSkills("React; TypeScript, Tailwind CSS")).toEqual([
      "React",
      "TypeScript",
      "Tailwind CSS",
    ]);
  });

  it("validates all 60 sample-jobs.json entries pass prepareJobRow", () => {
    const sampleJobs = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/seed/sample-jobs.json"),
        "utf8"
      )
    ) as Record<string, unknown>[];
    expect(sampleJobs).toHaveLength(60);

    for (const row of sampleJobs) {
      const res = prepareJobRow(row, {
        source: "sample",
        matcher,
        roles,
      });
      expect(res.status).toBe("ok");
    }
  });
});
