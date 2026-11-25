import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { listAdminUsers } from "@/server/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const users = await listAdminUsers(q);
    return NextResponse.json({ users });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
