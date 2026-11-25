import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageAdmin } from "@/server/auth";
import { getAdminOverview } from "@/server/services/admin";
import { AdminNav } from "@/components/admin/admin-nav";

async function AdminOverviewContent() {
  const admin = await requirePageAdmin();
  const overview = await getAdminOverview();

  const stats = [
    { label: "Total Users", value: overview.totalUsers },
    { label: "Students", value: overview.students },
    { label: "Blocked Users", value: overview.blocked },
    { label: "Job Postings", value: overview.jobs },
    { label: "Assistant Calls (24h)", value: overview.assistantCallsLast24h },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Signed in as admin: <strong className="text-foreground">{admin.email}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manage users, job role classifications, role skill weights, and
            dataset imports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
            Manage Users
          </Link>
          <Link href="/admin/jobs" className={buttonVariants({ variant: "outline" })}>
            Review &amp; Retag Jobs
          </Link>
          <Link href="/admin/roles" className={buttonVariants({ variant: "outline" })}>
            Edit Role Weights
          </Link>
          <Link href="/admin/import" className={buttonVariants()}>
            Import Jobs
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
      </div>
      <AdminNav active="/admin" />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <AdminOverviewContent />
      </Suspense>
    </section>
  );
}
