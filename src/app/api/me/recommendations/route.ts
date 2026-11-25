import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { recommendJobs } from "@/server/services/analysis";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  roleOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = QuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      roleOnly: request.nextUrl.searchParams.get("roleOnly") ?? undefined,
    });
    const data = await recommendJobs(user.id, parsed);
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
