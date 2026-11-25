import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { updateAdminUser } from "@/server/services/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const user = await updateAdminUser(actor.id, id, body);
    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
