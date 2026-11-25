import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { revalidateDashboardCache } from "@/server/cache/dashboard";
import { apiErrorResponse } from "@/server/lib/api-error";
import { AdminRoleSkillDeleteSchema, IdParamSchema } from "@/server/schemas";
import { removeRoleSkill, upsertRoleSkill } from "@/server/services/admin";

export async function PUT(
  request: Request,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    const { roleId: rawRoleId } = await context.params;
    const roleId = IdParamSchema.parse(rawRoleId);
    const body = await request.json();
    const roleSkill = await upsertRoleSkill(roleId, body);
    revalidateDashboardCache();
    return NextResponse.json({ roleSkill });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAdmin();
    const { roleId: rawRoleId } = await context.params;
    const roleId = IdParamSchema.parse(rawRoleId);
    const body = await request.json();
    const { skillId } = AdminRoleSkillDeleteSchema.parse(body);
    const result = await removeRoleSkill(roleId, skillId);
    revalidateDashboardCache();
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
