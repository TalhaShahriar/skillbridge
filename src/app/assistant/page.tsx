import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageUser } from "@/server/auth";
import { AssistantChatClient } from "@/components/assistant/assistant-chat-client";

async function AssistantContent() {
  const user = await requirePageUser();
  return <AssistantChatClient isAdmin={user.role === "ADMIN"} />;
}

export default function AssistantPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-[540px] w-full rounded-xl" />}>
        <AssistantContent />
      </Suspense>
    </section>
  );
}
