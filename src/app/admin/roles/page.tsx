import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageAdmin } from "@/server/auth";
import { listRolesWithSkills } from "@/server/services/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminRolesClient } from "@/components/admin/admin-roles-client";

async function AdminRolesContent() {
  await requirePageAdmin();
  const roles = await listRolesWithSkills();
  return <AdminRolesClient initialRoles={roles} />;
}

export default function AdminRolesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin — Roles &amp; Weights
        </h1>
      </div>
      <AdminNav active="/admin/roles" />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <AdminRolesContent />
      </Suspense>
    </section>
  );
}
