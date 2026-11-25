import crypto from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import {
  GeminiOutputError,
  GeminiUnavailableError,
  generateJson,
} from "@/server/lib/gemini";
import { updateAdminUser } from "@/server/services/admin";
import {
  getSkillGapForUser,
  recommendJobs,
} from "@/server/services/analysis";
import {
  ADMIN_ONLY_ACTIONS,
  ASSISTANT_GEMINI_RESPONSE_SCHEMA,
  DESTRUCTIVE_ACTIONS,
  RawAssistantEnvelopeSchema,
  validateAssistantAction,
  type AssistantActionName,
  type ValidatedAssistantAction,
} from "@/server/services/assistant/actions";
import { listJobs } from "@/server/services/jobs";
import {
  addSkills,
  removeSkills,
  setTargetRole,
} from "@/server/services/profile";
import { getSkillMatcher } from "@/server/services/skillCache";

export const MAX_MESSAGE_LENGTH = 500;
export const RATE_LIMIT_PER_MIN = 10;
export const RATE_LIMIT_PER_DAY = 100;
const CONFIRM_TTL_MS = 5 * 60 * 1000;

export interface AssistantRunUser {
  id: string;
  email: string;
  role: Role;
}

export interface AssistantResult {
  status: "ok" | "rejected" | "error" | "confirm_pending";
  action: string | null;
  reply: string;
  data: unknown;
}

interface ConfirmPayload {
  userId: string;
  action: AssistantActionName;
  args: Record<string, unknown>;
  reply: string;
  exp: number;
}

export function getConfirmSecret(): string {
  const secret =
    process.env.ASSISTANT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "skillbridge-dev-confirm-secret";
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function signConfirmToken(
  payload: ConfirmPayload,
  secret = getConfirmSecret()
): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyConfirmToken(
  token: string,
  expectedUserId: string,
  secret = getConfirmSecret(),
  nowMs = Date.now()
): ConfirmPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as ConfirmPayload;
    if (
      !parsed ||
      parsed.userId !== expectedUserId ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= nowMs
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildAssistantSystemPrompt(params: {
  roles: string[];
  currentTargetRoleName: string | null;
  isAdmin: boolean;
}): string {
  const adminActions = params.isAdmin
    ? `
- block_user: { "email": string }
- unblock_user: { "email": string }`
    : "";

  return `You are the SkillBridge Assistant. SkillBridge helps university students and fresh graduates explore tech & data job skill demand, track their skill profile, measure target-role readiness, and get job recommendations.

RULES:
1. Respond in English only.
2. Output JSON only matching { "action": string, "args": object, "reply": string }.
3. Never invent skills, jobs, counts, or database data.
4. For any request outside SkillBridge features (general coding help, essays, weather, etc.), use action "unsupported" with { "reason": string }.
5. For help questions about how SkillBridge works, use action "answer" with { "text": string }.

CONTEXT:
- Valid target roles: ${params.roles.join(", ")}
- User's current target role: ${params.currentTargetRoleName ?? "None"}

ALLOWED ACTIONS:
- add_skills: { "skills": [{ "name": string, "level"?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" }] }
- remove_skills: { "skills": [string] }
- set_target_role: { "role": string }
- search_jobs: { "query"?: string, "role"?: string, "workMode"?: "ONSITE" | "REMOTE" | "HYBRID" }
- show_skill_gap: {}
- show_recommendations: { "limit"?: number }
- answer: { "text": string }
- unsupported: { "reason": string }${adminActions}`;
}

function buildConfirmPreview(validated: ValidatedAssistantAction): string {
  switch (validated.action) {
    case "remove_skills":
      return `Remove skills from your profile: ${validated.args.skills.join(", ")}`;
    case "block_user":
      return `Block user account: ${validated.args.email}`;
    case "unblock_user":
      return `Unblock user account: ${validated.args.email}`;
    default:
      return `Confirm action: ${validated.action}`;
  }
}

async function logAssistantCall(
  userId: string,
  input: string,
  action: string | null,
  status: "ok" | "rejected" | "error" | "confirm_pending"
) {
  await db.assistantLog.create({
    data: {
      userId,
      input: input.slice(0, MAX_MESSAGE_LENGTH),
      action,
      status,
    },
  });
}

async function executeValidatedAction(
  user: AssistantRunUser,
  validated: ValidatedAssistantAction,
  roles: { id: string; name: string; slug: string }[]
): Promise<{ reply: string; data: unknown; status?: "ok" | "rejected" }> {
  switch (validated.action) {
    case "add_skills": {
      const result = await addSkills(
        user.id,
        validated.args.skills.map((s) => ({
          name: s.name,
          level: s.level ?? "BEGINNER",
        }))
      );
      return { reply: validated.reply, data: result };
    }

    case "remove_skills": {
      const matcher = await getSkillMatcher();
      const matchedIds: string[] = [];
      const unrecognized: string[] = [];
      for (const name of validated.args.skills) {
        const id = matcher.normalize(name);
        if (id) {
          matchedIds.push(id);
        } else {
          unrecognized.push(name);
        }
      }
      const removed =
        matchedIds.length > 0
          ? await removeSkills(user.id, matchedIds)
          : { removedCount: 0 };
      return {
        reply: validated.reply,
        data: { ...removed, unrecognized },
      };
    }

    case "set_target_role": {
      const needle = validated.args.role.trim().toLowerCase();
      const matchedRole = roles.find(
        (r) => r.name.toLowerCase() === needle || r.slug.toLowerCase() === needle
      );
      if (!matchedRole) {
        return {
          status: "rejected",
          reply: `Unknown role "${validated.args.role}". Valid roles: ${roles.map((r) => r.name).join(", ")}.`,
          data: null,
        };
      }
      const profile = await setTargetRole(user.id, matchedRole.id);
      return { reply: validated.reply, data: { profile, role: matchedRole } };
    }

    case "search_jobs": {
      let roleId: string | undefined;
      if (validated.args.role) {
        const needle = validated.args.role.trim().toLowerCase();
        const matchedRole = roles.find(
          (r) =>
            r.name.toLowerCase() === needle || r.slug.toLowerCase() === needle
        );
        roleId = matchedRole?.id;
      }
      const jobs = await listJobs({
        q: validated.args.query,
        roleId,
        workMode: validated.args.workMode,
        page: 1,
        pageSize: 10,
      });
      return { reply: validated.reply, data: jobs };
    }

    case "show_skill_gap": {
      const gap = await getSkillGapForUser(user.id);
      return { reply: validated.reply, data: gap };
    }

    case "show_recommendations": {
      const recs = await recommendJobs(user.id, {
        limit: validated.args.limit ?? 10,
      });
      return { reply: validated.reply, data: recs };
    }

    case "answer":
      return { reply: validated.args.text, data: { text: validated.args.text } };

    case "unsupported":
      return {
        reply: validated.reply,
        data: { reason: validated.args.reason },
      };

    case "block_user":
    case "unblock_user": {
      const target = await db.user.findUnique({
        where: { email: validated.args.email },
        select: { id: true, email: true },
      });
      if (!target) {
        return {
          status: "rejected",
          reply: `No user found with email ${validated.args.email}.`,
          data: null,
        };
      }
      const updated = await updateAdminUser(user.id, target.id, {
        blocked: validated.action === "block_user",
      });
      return { reply: validated.reply, data: { user: updated } };
    }
  }
}

export async function runAssistant(
  user: AssistantRunUser,
  message: string,
  options?: { confirmToken?: string }
): Promise<AssistantResult> {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
    await logAssistantCall(user.id, message, null, "rejected");
    return {
      status: "rejected",
      action: null,
      reply: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`,
      data: null,
    };
  }

  const now = Date.now();
  const oneMinuteAgo = new Date(now - 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  const [lastMinuteCount, lastDayCount] = await Promise.all([
    db.assistantLog.count({
      where: { userId: user.id, createdAt: { gte: oneMinuteAgo } },
    }),
    db.assistantLog.count({
      where: { userId: user.id, createdAt: { gte: oneDayAgo } },
    }),
  ]);

  if (
    lastMinuteCount >= RATE_LIMIT_PER_MIN ||
    lastDayCount >= RATE_LIMIT_PER_DAY
  ) {
    await logAssistantCall(user.id, trimmed, null, "rejected");
    return {
      status: "rejected",
      action: null,
      reply:
        "Rate limit exceeded (max 10 requests per minute and 100 per day). Please wait a moment.",
      data: null,
    };
  }

  const roles = await db.jobRole.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  if (options?.confirmToken) {
    const verified = verifyConfirmToken(options.confirmToken, user.id);
    if (!verified) {
      await logAssistantCall(user.id, trimmed, null, "rejected");
      return {
        status: "rejected",
        action: null,
        reply:
          "Confirmation token is invalid or expired. Please send your request again.",
        data: null,
      };
    }

    const validated = validateAssistantAction({
      action: verified.action,
      args: verified.args,
      reply: verified.reply,
    });
    if (!validated) {
      await logAssistantCall(user.id, trimmed, verified.action, "rejected");
      return {
        status: "rejected",
        action: verified.action,
        reply: "Confirmed action is invalid.",
        data: null,
      };
    }

    if (ADMIN_ONLY_ACTIONS.has(validated.action) && user.role !== "ADMIN") {
      await logAssistantCall(user.id, trimmed, validated.action, "rejected");
      return {
        status: "rejected",
        action: validated.action,
        reply: "Admin access is required for that action.",
        data: null,
      };
    }

    const exec = await executeValidatedAction(user, validated, roles);
    const status = exec.status ?? "ok";
    await logAssistantCall(user.id, trimmed, validated.action, status);
    return {
      status,
      action: validated.action,
      reply: exec.reply,
      data: exec.data,
    };
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: {
      targetRole: { select: { name: true } },
    },
  });

  const systemPrompt = buildAssistantSystemPrompt({
    roles: roles.map((r) => r.name),
    currentTargetRoleName: profile?.targetRole?.name ?? null,
    isAdmin: user.role === "ADMIN",
  });

  let rawResponse: { action: string; args: Record<string, unknown>; reply: string };
  try {
    rawResponse = await generateJson(
      systemPrompt,
      trimmed,
      RawAssistantEnvelopeSchema,
      ASSISTANT_GEMINI_RESPONSE_SCHEMA
    );
  } catch (err) {
    if (err instanceof GeminiUnavailableError) {
      await logAssistantCall(user.id, trimmed, null, "error");
      return {
        status: "error",
        action: null,
        reply: "Assistant is temporarily unavailable, use the normal pages.",
        data: null,
      };
    }
    if (err instanceof GeminiOutputError) {
      await logAssistantCall(user.id, trimmed, null, "rejected");
      return {
        status: "rejected",
        action: null,
        reply:
          "Sorry, I could not understand that request. Please rephrase or use the normal pages.",
        data: null,
      };
    }
    throw err;
  }

  const validated = validateAssistantAction(rawResponse);
  if (!validated) {
    await logAssistantCall(user.id, trimmed, rawResponse.action, "rejected");
    return {
      status: "rejected",
      action: rawResponse.action,
      reply: "That action is not supported.",
      data: null,
    };
  }

  if (ADMIN_ONLY_ACTIONS.has(validated.action) && user.role !== "ADMIN") {
    await logAssistantCall(user.id, trimmed, validated.action, "rejected");
    return {
      status: "rejected",
      action: validated.action,
      reply: "Admin access is required for that action.",
      data: null,
    };
  }

  if (DESTRUCTIVE_ACTIONS.has(validated.action)) {
    const confirmToken = signConfirmToken({
      userId: user.id,
      action: validated.action,
      args: validated.args as Record<string, unknown>,
      reply: validated.reply,
      exp: Date.now() + CONFIRM_TTL_MS,
    });
    const preview = buildConfirmPreview(validated);
    await logAssistantCall(user.id, trimmed, validated.action, "confirm_pending");
    return {
      status: "confirm_pending",
      action: validated.action,
      reply: validated.reply,
      data: { preview, confirmToken },
    };
  }

  const exec = await executeValidatedAction(user, validated, roles);
  const status = exec.status ?? "ok";
  await logAssistantCall(user.id, trimmed, validated.action, status);

  return {
    status,
    action: validated.action,
    reply: exec.reply,
    data: exec.data,
  };
}
