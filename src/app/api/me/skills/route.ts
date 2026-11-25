import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import {
  AddSkillsInputSchema,
  RemoveSkillsInputSchema,
} from "@/server/schemas";
import {
  addSkills,
  listUserSkills,
  removeSkills,
} from "@/server/services/profile";

export async function GET() {
  try {
    const user = await requireUser();
    const skills = await listUserSkills(user.id);
    return NextResponse.json({ skills });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = AddSkillsInputSchema.parse(body);
    const result = await addSkills(user.id, parsed.skills);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = RemoveSkillsInputSchema.parse(body);
    const result = await removeSkills(user.id, parsed.skillIds);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
