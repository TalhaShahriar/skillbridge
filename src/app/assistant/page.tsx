import { Suspense } from "react";
import { requirePageUser } from "@/server/auth";

async function AssistantContent() {
  await requirePageUser();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        SkillBridge AI assistant coming soon.
      </p>
    </section>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 text-sm text-muted-foreground">Loading...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
