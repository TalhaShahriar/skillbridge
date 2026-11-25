import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCachedDashboardData } from "@/server/cache/dashboard";
import {
  JobsByRoleChart,
  SplitDonutChart,
  TopSkillsChart,
} from "@/components/dashboard/dashboard-charts";
import { RoleFilterSelect } from "@/components/dashboard/role-filter";

interface DashboardPageProps {
  searchParams: Promise<{ roleId?: string | string[] }>;
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
  const raw = await searchParams;
  const roleId = Array.isArray(raw.roleId) ? raw.roleId[0] : raw.roleId;
  const data = await getCachedDashboardData(roleId || undefined);
  const { totals } = data;

  const primaryCount =
    totals.datasetJobs > 0 ? totals.datasetJobs : totals.jobs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Based on <strong className="text-foreground">{primaryCount}</strong>{" "}
            postings from{" "}
            <strong className="text-foreground">{totals.datasetName}</strong>
            {totals.manualBdJobs > 0
              ? ` (+ ${totals.manualBdJobs} manually collected Bangladesh postings)`
              : ""}
            {totals.sampleJobs > 0 && totals.datasetJobs === 0
              ? ` (includes ${totals.sampleJobs} fictional sample postings)`
              : ""}
            . Not live market data.
          </p>
        </div>
        {totals.datasetUrl && (
          <a
            href={totals.datasetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "shrink-0",
            })}
          >
            Dataset Source
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {data.selectedRoleName
              ? `Filtered by: ${data.selectedRoleName}`
              : "All Tech & Data Roles"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {data.scopeJobCount} posting{data.scopeJobCount === 1 ? "" : "s"} in
            current filter
          </p>
        </div>
        <RoleFilterSelect
          roles={data.roles}
          selectedRoleId={data.selectedRoleId}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Postings</CardDescription>
            <CardTitle className="text-3xl">{totals.jobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tech &amp; Data Roles</CardDescription>
            <CardTitle className="text-3xl">{totals.roles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Skills Tracked</CardDescription>
            <CardTitle className="text-3xl">{totals.skillsTracked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {totals.jobs === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No job postings imported yet</CardTitle>
            <CardDescription>
              Run the seed and job import CLI (or use the Admin import panel) to
              populate market charts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/jobs"
              className={buttonVariants({ variant: "outline" })}
            >
              Go to Jobs
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Top 15 In-Demand Skills</CardTitle>
              <CardDescription>
                Percentage of{" "}
                {data.selectedRoleName
                  ? `${data.selectedRoleName} postings`
                  : "all postings"}{" "}
                mentioning each skill.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopSkillsChart data={data.topSkills} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Jobs by Role</CardTitle>
                <CardDescription>
                  Distribution of imported postings across roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobsByRoleChart data={data.jobsByRole} />
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Work Mode Split</CardTitle>
                </CardHeader>
                <CardContent>
                  <SplitDonutChart data={data.workModeSplit} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Experience Level Split
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SplitDonutChart data={data.levelSplit} />
                </CardContent>
              </Card>
            </div>
          </div>

          {data.topSkillsByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Skills by Category</CardTitle>
                <CardDescription>
                  Top 5 skills within each technical and soft skill category.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.topSkillsByCategory.map((group) => (
                  <div
                    key={group.category}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.category}
                    </h3>
                    <div className="space-y-1.5">
                      {group.skills.map((s) => (
                        <div
                          key={s.skillId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{s.name}</span>
                          <Badge variant="secondary">{s.pct}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Market Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore skill demand across tech and data job postings.
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
