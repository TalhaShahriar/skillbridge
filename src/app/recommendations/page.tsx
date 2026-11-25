import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageUser } from "@/server/auth";
import { recommendJobs } from "@/server/services/analysis";
import { RecommendationsClient } from "@/components/analysis/recommendations-client";

async function RecommendationsContent() {
  const user = await requirePageUser();
  const data = await recommendJobs(user.id, { limit: 20, roleOnly: true });

  return (
    <RecommendationsClient
      hasSkills={data.hasSkills}
      targetRole={data.targetRole}
      jobs={data.jobs}
    />
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recommendations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs ranked by weighted skill match for your target role.
        </p>
      </div>
      <Suspense fallback={<RecommendationsSkeleton />}>
        <RecommendationsContent />
      </Suspense>
    </section>
  );
}
