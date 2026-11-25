import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { SearchQueryParamSchema } from "@/server/schemas";
import { listAdminJobs } from "@/server/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { q } = SearchQueryParamSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });
    const jobs = await listAdminJobs(q);
    return NextResponse.json({ jobs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
