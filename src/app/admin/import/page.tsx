import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageAdmin } from "@/server/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminImportClient } from "@/components/admin/admin-import-client";

async function AdminImportContent() {
  await requirePageAdmin();
  return <AdminImportClient />;
}

export default function AdminImportPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin — Import</h1>
      </div>
      <AdminNav active="/admin/import" />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <AdminImportContent />
      </Suspense>
    </section>
  );
}
