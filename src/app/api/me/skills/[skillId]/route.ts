import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { IdParamSchema, UpdateSkillLevelSchema } from "@/server/schemas";
import { updateSkillLevel } from "@/server/services/profile";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ skillId: string }> }
) {
  try {
    const user = await requireUser();
    const { skillId: rawSkillId } = await context.params;
    const skillId = IdParamSchema.parse(rawSkillId);
    const body = await request.json();
    const parsed = UpdateSkillLevelSchema.parse(body);
    const skill = await updateSkillLevel(user.id, skillId, parsed.level);
    return NextResponse.json({ skill });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
