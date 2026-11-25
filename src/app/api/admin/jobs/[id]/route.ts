import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { revalidateDashboardCache } from "@/server/cache/dashboard";
import { apiErrorResponse } from "@/server/lib/api-error";
import { IdParamSchema } from "@/server/schemas";
import { overrideJobRole } from "@/server/services/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: rawId } = await context.params;
    const id = IdParamSchema.parse(rawId);
    const body = await request.json();
    const job = await overrideJobRole(id, body);
    revalidateDashboardCache();
    return NextResponse.json({ job });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
