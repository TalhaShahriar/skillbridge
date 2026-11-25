import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import { JobsQuerySchema } from "@/server/schemas";
import { listJobs } from "@/server/services/jobs";
import { JobsBrowserClient } from "@/components/jobs/jobs-browser-client";

interface JobsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

async function JobsContent({ searchParams }: JobsPageProps) {
  const raw = await searchParams;
  const parsed = JobsQuerySchema.safeParse({
    q: firstParam(raw.q) || undefined,
    roleId: firstParam(raw.roleId) || undefined,
    workMode: firstParam(raw.workMode) || undefined,
    level: firstParam(raw.level) || undefined,
    page: firstParam(raw.page) || undefined,
    pageSize: firstParam(raw.pageSize) || undefined,
  });

  const filters = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20 };

  const [jobsData, roles] = await Promise.all([
    listJobs(filters),
    process.env.DATABASE_URL
      ? db.jobRole.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <JobsBrowserClient
      items={jobsData.items}
      total={jobsData.total}
      page={jobsData.page}
      totalPages={jobsData.totalPages}
      pageSize={jobsData.pageSize}
      datasetName={jobsData.datasetName}
      roles={roles}
      initialFilters={{
        q: filters.q ?? "",
        roleId: filters.roleId ?? "",
        workMode: filters.workMode ?? "",
        level: filters.level ?? "",
      }}
    />
  );
}

function JobsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

export default function JobsPage({ searchParams }: JobsPageProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse imported tech and data job postings and their extracted skills.
        </p>
      </div>
      <Suspense fallback={<JobsSkeleton />}>
        <JobsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
