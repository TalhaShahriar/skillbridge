import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageUser } from "@/server/auth";
import { db } from "@/server/db";
import { getSkillGapForUser } from "@/server/services/analysis";
import { SkillGapClient } from "@/components/analysis/skill-gap-client";

async function SkillGapContent() {
  const user = await requirePageUser();
  const [skillGapData, roles] = await Promise.all([
    getSkillGapForUser(user.id),
    db.jobRole.findMany({
      select: { id: true, name: true, slug: true, description: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SkillGapClient
      hasTargetRole={skillGapData.hasTargetRole}
      targetRole={skillGapData.targetRole}
      gap={skillGapData.gap}
      demandBySkillId={skillGapData.demandBySkillId}
      roles={roles}
    />
  );
}

function SkillGapSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function SkillGapPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skill Gap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare your current skills against your target role requirements.
        </p>
      </div>
      <Suspense fallback={<SkillGapSkeleton />}>
        <SkillGapContent />
      </Suspense>
    </section>
  );
}
