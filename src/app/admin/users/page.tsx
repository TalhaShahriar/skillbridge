import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageAdmin } from "@/server/auth";
import { listAdminUsers } from "@/server/services/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

async function AdminUsersContent() {
  const admin = await requirePageAdmin();
  const users = await listAdminUsers();

  return (
    <AdminUsersClient
      currentAdminId={admin.id}
      initialUsers={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}

export default function AdminUsersPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin — Users</h1>
      </div>
      <AdminNav active="/admin/users" />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <AdminUsersContent />
      </Suspense>
    </section>
  );
}
