import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { listAdminJobs } from "@/server/services/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminJobsClient } from "@/components/admin/admin-jobs-client";

async function AdminJobsContent() {
  await requirePageAdmin();
  const [jobs, roles] = await Promise.all([
    listAdminJobs(),
    db.jobRole.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <AdminJobsClient initialJobs={jobs} roles={roles} />;
}

export default function AdminJobsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin — Jobs</h1>
      </div>
      <AdminNav active="/admin/jobs" />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <AdminJobsContent />
      </Suspense>
    </section>
  );
}
