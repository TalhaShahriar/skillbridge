import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/server/lib/api-error";
import { JobsQuerySchema } from "@/server/schemas";
import { listJobs } from "@/server/services/jobs";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const parsed = JobsQuerySchema.parse({
      q: sp.get("q") || undefined,
      roleId: sp.get("roleId") || undefined,
      workMode: sp.get("workMode") || undefined,
      level: sp.get("level") || undefined,
      page: sp.get("page") || undefined,
      pageSize: sp.get("pageSize") || undefined,
    });

    const data = await listJobs(parsed);
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
