import Link from "next/link";
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

interface SkillChip {
  id: string;
  name: string;
  category: string;
}

export interface RecommendedJobCard {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  workMode: string;
  level: string;
  source: string;
  role: { id: string; name: string; slug: string } | null;
  matchPct: number;
  matching: SkillChip[];
  missing: SkillChip[];
}

export function RecommendationsClient({
  hasSkills,
  targetRole,
  jobs,
}: {
  hasSkills: boolean;
  targetRole: { id: string; name: string; slug: string } | null;
  jobs: RecommendedJobCard[];
}) {
  if (!hasSkills) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add skills to get recommendations</CardTitle>
          <CardDescription>
            We match jobs based on the skills in your profile. Add at least one
            skill to see your top matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/profile" className={buttonVariants()}>
            Go to Profile &amp; Skills
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No matching jobs found yet</CardTitle>
          <CardDescription>
            {targetRole
              ? `No imported jobs found for ${targetRole.name} yet.`
              : "No jobs have been imported yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/jobs"
            className={buttonVariants({ variant: "outline" })}
          >
            Browse All Jobs
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing top {jobs.length} recommendations
        {targetRole ? ` for ${targetRole.name}` : " across all roles"}.
      </p>

      <div className="space-y-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {job.title}
                  </Link>
                  {job.source === "sample" && (
                    <Badge variant="outline">Sample</Badge>
                  )}
                </div>
                <CardDescription>
                  {[job.company, job.location, job.workMode]
                    .filter(Boolean)
                    .join(" · ")}
                </CardDescription>
              </div>

              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <Badge variant="default" className="text-sm">
                  {job.matchPct}% match
                </Badge>
                <div className="w-28">
                  <Progress value={job.matchPct} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {job.matching.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-muted-foreground">
                    Matching:
                  </span>
                  {job.matching.map((skill) => (
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

              {job.missing.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-muted-foreground">
                    Missing:
                  </span>
                  {job.missing.map((skill) => (
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
