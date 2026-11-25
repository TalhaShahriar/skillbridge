import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { revalidateDashboardCache } from "@/server/cache/dashboard";
import { apiErrorResponse } from "@/server/lib/api-error";
import { retagAllJobs } from "@/server/services/jobImport";

export async function POST() {
  try {
    await requireAdmin();
    const summary = await retagAllJobs();
    revalidateDashboardCache();
    return NextResponse.json({ summary });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
