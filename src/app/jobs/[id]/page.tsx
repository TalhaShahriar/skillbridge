import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJobSourceLabel } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { getJobWithMatchForUser } from "@/server/services/jobs";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

async function JobDetailContent({ params }: JobDetailPageProps) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const data = await getJobWithMatchForUser(id, user?.id ?? null);

  if (!data) {
    notFound();
  }

  const { job, match, datasetName } = data;
  const salaryText =
    job.salaryMin || job.salaryMax
      ? `${job.salaryCurrency ?? ""} ${job.salaryMin ?? "?"} – ${job.salaryMax ?? "?"}`.trim()
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/jobs"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Back to Jobs
        </Link>
        <span className="text-xs text-muted-foreground">
          {formatJobSourceLabel(job.source, datasetName)}
        </span>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">{job.title}</CardTitle>
            {job.role && <Badge variant="secondary">{job.role.name}</Badge>}
            {job.source === "sample" && <Badge variant="outline">Sample</Badge>}
            {job.source === "manual-bd" && (
              <Badge variant="outline">manual-bd</Badge>
            )}
          </div>
          <CardDescription>
            {[job.company, job.location, job.workMode, job.level, salaryText]
              .filter(Boolean)
              .join(" · ")}
          </CardDescription>
          {job.sourceUrl && (
            <div className="pt-1">
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View Original Posting
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Extracted Skills</h2>
            {job.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills extracted for this posting.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <Badge key={skill.id} variant="outline">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Job Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {match && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Your Skill Match</CardTitle>
              <CardDescription>
                Weighted overlap with your profile skills.
              </CardDescription>
            </div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <Badge className="text-sm">{match.matchPct}% match</Badge>
              <div className="w-32">
                <Progress value={match.matchPct} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!match.hasUserSkills ? (
              <p className="text-sm text-muted-foreground">
                Add skills on your{" "}
                <Link href="/profile" className="underline">
                  Profile
                </Link>{" "}
                to see your match breakdown.
              </p>
            ) : (
              <>
                {match.matching.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">
                      You have:
                    </span>
                    {match.matching.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {match.missing.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">
                      Missing:
                    </span>
                    {match.missing.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="secondary"
                        className="text-muted-foreground"
                      >
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <JobDetailContent params={params} />
      </Suspense>
    </section>
  );
}
