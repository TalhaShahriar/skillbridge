import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/server/lib/api-error";
import { IdParamSchema } from "@/server/schemas";
import { getJob } from "@/server/services/jobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = IdParamSchema.parse(rawId);
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
