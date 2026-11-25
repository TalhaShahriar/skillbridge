"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Send, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface AssistantApiResponse {
  status: "ok" | "rejected" | "error" | "confirm_pending";
  action: string | null;
  reply: string;
  data: unknown;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  originalPrompt?: string;
  response?: AssistantApiResponse;
  confirmHandled?: "confirmed" | "cancelled";
}

const STUDENT_PROMPTS = [
  "Add React and TypeScript to my skills",
  "Set my target role to Data Analyst",
  "Show my skill gap",
  "Recommend jobs for me",
  "Find remote backend jobs",
];

const ADMIN_PROMPT = "Block user x@y.com";

const MUTATING_ACTIONS = new Set([
  "add_skills",
  "remove_skills",
  "set_target_role",
  "block_user",
  "unblock_user",
]);

function AssistantDataCards({
  action,
  data,
}: {
  action: string | null;
  data: unknown;
}) {
  if (!action || !data || typeof data !== "object") return null;

  if (action === "add_skills") {
    const d = data as {
      added?: { skillId: string; name: string; level: string }[];
      unrecognized?: string[];
    };
    return (
      <div className="mt-3 space-y-2 border-t pt-2.5 text-xs">
        {d.added && d.added.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-muted-foreground">Added:</span>
            {d.added.map((s) => (
              <Badge
                key={s.skillId}
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                {s.name} ({s.level.toLowerCase()})
              </Badge>
            ))}
          </div>
        )}
        {d.unrecognized && d.unrecognized.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-muted-foreground">
              Unrecognized:
            </span>
            {d.unrecognized.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === "remove_skills") {
    const d = data as { removedCount?: number; unrecognized?: string[] };
    if (typeof d.removedCount !== "number") return null;
    return (
      <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
        Removed {d.removedCount} skill{d.removedCount === 1 ? "" : "s"}.
      </div>
    );
  }

  if (action === "set_target_role") {
    const d = data as { role?: { name: string } };
    if (!d.role) return null;
    return (
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-xs">
        <Badge variant="secondary">Target: {d.role.name}</Badge>
        <Link href="/skill-gap" className="underline">
          View Skill Gap
        </Link>
      </div>
    );
  }

  if (action === "show_skill_gap") {
    const d = data as {
      hasTargetRole?: boolean;
      targetRole?: { name: string } | null;
      gap?: {
        readinessPct: number;
        missing: { skillId: string; name: string; weight: number }[];
      } | null;
    };
    if (!d.hasTargetRole || !d.gap) {
      return (
        <div className="mt-2 border-t pt-2 text-xs">
          No target role set.{" "}
          <Link href="/skill-gap" className="underline">
            Pick a target role
          </Link>
        </div>
      );
    }
    return (
      <div className="mt-3 space-y-2 border-t pt-2.5 text-xs">
        <div className="flex items-center justify-between font-medium">
          <span>{d.targetRole?.name} Readiness</span>
          <span>{d.gap.readinessPct}%</span>
        </div>
        <Progress value={d.gap.readinessPct} />
        {d.gap.missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <span className="text-muted-foreground">Missing:</span>
            {d.gap.missing.slice(0, 6).map((s) => (
              <Badge key={s.skillId} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </div>
        )}
        <Link href="/skill-gap" className="inline-block underline">
          Open full Skill Gap
        </Link>
      </div>
    );
  }

  if (action === "search_jobs") {
    const d = data as {
      items?: {
        id: string;
        title: string;
        company: string | null;
        workMode: string;
      }[];
      total?: number;
    };
    if (!d.items) return null;
    return (
      <div className="mt-3 space-y-2 border-t pt-2.5 text-xs">
        {d.items.length === 0 ? (
          <p className="text-muted-foreground">No matching jobs found.</p>
        ) : (
          d.items.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-2 rounded border bg-background px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {job.title}
                </Link>
                <span className="text-muted-foreground">
                  {[job.company, job.workMode].filter(Boolean).join(" · ")}
                </span>
              </div>
            </div>
          ))
        )}
        <Link href="/jobs" className="inline-block underline">
          Browse all jobs ({d.total ?? d.items.length})
        </Link>
      </div>
    );
  }

  if (action === "show_recommendations") {
    const d = data as {
      hasSkills?: boolean;
      jobs?: {
        id: string;
        title: string;
        company: string | null;
        matchPct: number;
      }[];
    };
    if (!d.hasSkills) {
      return (
        <div className="mt-2 border-t pt-2 text-xs">
          Add skills on your{" "}
          <Link href="/profile" className="underline">
            Profile
          </Link>{" "}
          to see recommendations.
        </div>
      );
    }
    return (
      <div className="mt-3 space-y-2 border-t pt-2.5 text-xs">
        {(d.jobs ?? []).slice(0, 5).map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between gap-2 rounded border bg-background px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <Link
                href={`/jobs/${job.id}`}
                className="block truncate font-medium hover:underline"
              >
                {job.title}
              </Link>
              <span className="text-muted-foreground">{job.company ?? "—"}</span>
            </div>
            <Badge variant="default">{job.matchPct}%</Badge>
          </div>
        ))}
        <Link href="/recommendations" className="inline-block underline">
          View all recommendations
        </Link>
      </div>
    );
  }

  return null;
}

export function AssistantChatClient({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  const prompts = isAdmin ? [...STUDENT_PROMPTS, ADMIN_PROMPT] : STUDENT_PROMPTS;

  async function sendMessage(
    text: string,
    confirmToken?: string,
    confirmMsgId?: string
  ) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    if (!confirmToken) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", text: trimmed },
      ]);
      setInput("");
    } else if (confirmMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === confirmMsgId ? { ...m, confirmHandled: "confirmed" } : m
        )
      );
    }

    setPending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          ...(confirmToken ? { confirmToken } : {}),
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | AssistantApiResponse
        | { error?: string }
        | null;

      if (!res.ok || !body || !("status" in body)) {
        const errMsg =
          (body && "error" in body && body.error) ||
          "Assistant request failed. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: errMsg,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: body.reply,
          originalPrompt: trimmed,
          response: body,
        },
      ]);

      if (
        body.status === "ok" &&
        body.action &&
        MUTATING_ACTIONS.has(body.action)
      ) {
        router.refresh();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Assistant is temporarily unavailable, use the normal pages.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function handleCancelConfirm(msgId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, confirmHandled: "cancelled" } : m
      )
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <div>
            <CardTitle className="text-lg">SkillBridge Assistant</CardTitle>
            <CardDescription>
              Ask in English to update skills, check your skill gap, or find
              jobs.
            </CardDescription>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            disabled={pending}
          >
            <Trash2 className="size-4" />
            Clear chat
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={pending}
              onClick={() => sendMessage(prompt)}
              className={buttonVariants({
                variant: "outline",
                size: "xs",
                className: "gap-1",
              })}
            >
              <Sparkles className="size-3" />
              {prompt}
            </button>
          ))}
        </div>

        <div className="min-h-80 max-h-[520px] space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-4">
          {messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Click a suggested prompt above or type a message below to get
              started.
            </p>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const pendingData =
                msg.response?.status === "confirm_pending"
                  ? (msg.response.data as {
                      preview?: string;
                      confirmToken?: string;
                    } | null)
                  : null;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card text-card-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {!isUser && msg.response?.status === "ok" && (
                      <AssistantDataCards
                        action={msg.response.action}
                        data={msg.response.data}
                      />
                    )}

                    {!isUser &&
                      msg.response?.status === "confirm_pending" &&
                      pendingData?.confirmToken && (
                        <div className="mt-3 space-y-2 border-t pt-2.5 text-xs">
                          <p className="font-medium">
                            {pendingData.preview ?? "Confirm this action?"}
                          </p>
                          {msg.confirmHandled ? (
                            <span className="text-muted-foreground">
                              {msg.confirmHandled === "confirmed"
                                ? "Confirmed"
                                : "Cancelled"}
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="xs"
                                disabled={pending}
                                onClick={() =>
                                  sendMessage(
                                    msg.originalPrompt ?? "confirm",
                                    pendingData.confirmToken,
                                    msg.id
                                  )
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={pending}
                                onClick={() => handleCancelConfirm(msg.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })
          )}

          {pending && (
            <div className="flex justify-start">
              <div className="rounded-xl border bg-card px-3.5 py-2 text-xs text-muted-foreground">
                SkillBridge Assistant is thinking...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="space-y-2"
        >
          <Textarea
            placeholder="Ask SkillBridge (Enter to send, Shift+Enter for new line)..."
            value={input}
            maxLength={500}
            disabled={pending}
            rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {input.length} / 500
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !input.trim()}
            >
              <Send className="size-4" />
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
