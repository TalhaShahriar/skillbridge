import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { IdParamSchema } from "@/server/schemas";
import { updateAdminUser } from "@/server/services/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    const { id: rawId } = await context.params;
    const id = IdParamSchema.parse(rawId);
    const body = await request.json();
    const user = await updateAdminUser(actor.id, id, body);
    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
