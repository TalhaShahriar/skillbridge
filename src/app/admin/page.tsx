import { Suspense } from "react";
import { requirePageAdmin } from "@/server/auth";

async function AdminContent() {
  const admin = await requirePageAdmin();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin console for {admin.email}.
      </p>
    </section>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 text-sm text-muted-foreground">Loading...</div>}>
      <AdminContent />
    </Suspense>
  );
}
