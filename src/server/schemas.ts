import { z } from "zod";

export const SkillLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export type SkillLevelInput = z.infer<typeof SkillLevelSchema>;

export const ExperienceLevelSchema = z.enum([
  "INTERN",
  "ENTRY",
  "MID",
  "SENIOR",
  "UNKNOWN",
]);
export type ExperienceLevelInput = z.infer<typeof ExperienceLevelSchema>;

export const EducationItemSchema = z.object({
  degree: z.string().trim().min(1, "Degree is required").max(120),
  institution: z.string().trim().min(1, "Institution is required").max(160),
  year: z.string().trim().max(20).optional().default(""),
});
export type EducationItem = z.infer<typeof EducationItemSchema>;

export const UpdateProfileSchema = z.object({
  education: z.array(EducationItemSchema).max(10).optional(),
  experienceLevel: ExperienceLevelSchema.nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  targetRoleId: z.string().min(1).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const AddSkillItemSchema = z
  .object({
    skillId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(80).optional(),
    level: SkillLevelSchema.default("BEGINNER"),
  })
  .refine((v) => Boolean(v.skillId || v.name), {
    message: "Either skillId or name is required",
  });
export type AddSkillItemInput = z.infer<typeof AddSkillItemSchema>;

export const AddSkillsInputSchema = z.object({
  skills: z.array(AddSkillItemSchema).min(1).max(50),
});

export const UpdateSkillLevelSchema = z.object({
  level: SkillLevelSchema,
});

export const RemoveSkillsInputSchema = z.object({
  skillIds: z.array(z.string().min(1)).min(1).max(50),
});

export const SetTargetRoleSchema = z.object({
  roleId: z.string().min(1).nullable(),
});
