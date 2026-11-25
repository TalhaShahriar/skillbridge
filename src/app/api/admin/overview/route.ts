import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { getAdminOverview } from "@/server/services/admin";

export async function GET() {
  try {
    await requireAdmin();
    const overview = await getAdminOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
