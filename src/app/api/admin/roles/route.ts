import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { listRolesWithSkills } from "@/server/services/admin";

export async function GET() {
  try {
    await requireAdmin();
    const roles = await listRolesWithSkills();
    return NextResponse.json({ roles });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
