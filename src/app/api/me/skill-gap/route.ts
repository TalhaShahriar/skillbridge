import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { getSkillGapForUser } from "@/server/services/analysis";

export async function GET() {
  try {
    const user = await requireUser();
    const data = await getSkillGapForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
