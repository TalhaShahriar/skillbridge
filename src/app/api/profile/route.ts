import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { UpdateProfileSchema } from "@/server/schemas";
import { getProfile, updateProfile } from "@/server/services/profile";

export async function GET() {
  try {
    const user = await requireUser();
    const data = await getProfile(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = UpdateProfileSchema.parse(body);
    const profile = await updateProfile(user.id, parsed);
    return NextResponse.json({ profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
