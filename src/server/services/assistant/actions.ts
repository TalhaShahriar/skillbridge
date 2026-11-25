import { Type, type SchemaUnion } from "@google/genai";
import { z } from "zod";
import { SkillLevelSchema, WorkModeSchema } from "@/server/schemas";

export const AddSkillsArgsSchema = z.object({
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        level: SkillLevelSchema.optional(),
      })
    )
    .min(1)
    .max(20),
});

export const RemoveSkillsArgsSchema = z.object({
  skills: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
});

export const SetTargetRoleArgsSchema = z.object({
  role: z.string().trim().min(1).max(100),
});

export const SearchJobsArgsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  role: z.string().trim().max(100).optional(),
  workMode: WorkModeSchema.optional(),
});

export const ShowSkillGapArgsSchema = z.object({});

export const ShowRecommendationsArgsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const AnswerArgsSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export const UnsupportedArgsSchema = z.object({
  reason: z.string().trim().min(1).max(400),
});

export const BlockUserArgsSchema = z.object({
  email: z.string().trim().email(),
});

export const ACTION_ARG_SCHEMAS = {
  add_skills: AddSkillsArgsSchema,
  remove_skills: RemoveSkillsArgsSchema,
  set_target_role: SetTargetRoleArgsSchema,
  search_jobs: SearchJobsArgsSchema,
  show_skill_gap: ShowSkillGapArgsSchema,
  show_recommendations: ShowRecommendationsArgsSchema,
  answer: AnswerArgsSchema,
  unsupported: UnsupportedArgsSchema,
  block_user: BlockUserArgsSchema,
  unblock_user: BlockUserArgsSchema,
} as const;

export type AssistantActionName = keyof typeof ACTION_ARG_SCHEMAS;

export const ADMIN_ONLY_ACTIONS = new Set<AssistantActionName>([
  "block_user",
  "unblock_user",
]);

export const DESTRUCTIVE_ACTIONS = new Set<AssistantActionName>([
  "remove_skills",
  "block_user",
  "unblock_user",
]);

export const RawAssistantEnvelopeSchema = z.object({
  action: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({}),
  reply: z.string().trim().min(1).max(400),
});

export type ValidatedAssistantAction =
  | { action: "add_skills"; args: z.infer<typeof AddSkillsArgsSchema>; reply: string }
  | { action: "remove_skills"; args: z.infer<typeof RemoveSkillsArgsSchema>; reply: string }
  | { action: "set_target_role"; args: z.infer<typeof SetTargetRoleArgsSchema>; reply: string }
  | { action: "search_jobs"; args: z.infer<typeof SearchJobsArgsSchema>; reply: string }
  | { action: "show_skill_gap"; args: z.infer<typeof ShowSkillGapArgsSchema>; reply: string }
  | { action: "show_recommendations"; args: z.infer<typeof ShowRecommendationsArgsSchema>; reply: string }
  | { action: "answer"; args: z.infer<typeof AnswerArgsSchema>; reply: string }
  | { action: "unsupported"; args: z.infer<typeof UnsupportedArgsSchema>; reply: string }
  | { action: "block_user"; args: z.infer<typeof BlockUserArgsSchema>; reply: string }
  | { action: "unblock_user"; args: z.infer<typeof BlockUserArgsSchema>; reply: string };

export function validateAssistantAction(raw: {
  action: string;
  args: Record<string, unknown>;
  reply: string;
}): ValidatedAssistantAction | null {
  if (!(raw.action in ACTION_ARG_SCHEMAS)) {
    return null;
  }

  const action = raw.action as AssistantActionName;
  const schema = ACTION_ARG_SCHEMAS[action];
  const parsedArgs = schema.safeParse(raw.args ?? {});
  if (!parsedArgs.success) {
    return null;
  }

  return {
    action,
    args: parsedArgs.data,
    reply: raw.reply,
  } as ValidatedAssistantAction;
}

export const ASSISTANT_GEMINI_RESPONSE_SCHEMA: SchemaUnion = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      description: "Whitelisted action name",
    },
    args: {
      type: Type.OBJECT,
      description: "Arguments object for the chosen action",
    },
    reply: {
      type: Type.STRING,
      description: "Short friendly English sentence for the user",
    },
  },
  required: ["action", "args", "reply"],
};
