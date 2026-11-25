import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { CvApplySchema } from "@/server/schemas";
import {
  addSkills,
  getProfile,
  listUserSkills,
  updateProfile,
} from "@/server/services/profile";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = CvApplySchema.parse(body);

    const [{ profile }, existingSkills] = await Promise.all([
      getProfile(user.id),
      listUserSkills(user.id),
    ]);

    const existingSkillIds = new Set(existingSkills.map((s) => s.skillId));
    const newSkills = parsed.skills.filter(
      (s) => !existingSkillIds.has(s.skillId)
    );

    if (newSkills.length > 0) {
      await addSkills(
        user.id,
        newSkills.map((s) => ({ skillId: s.skillId, level: s.level }))
      );
    }

    const existingEduKeys = new Set(
      profile.education.map(
        (e) => `${e.degree.toLowerCase()}|${e.institution.toLowerCase()}`
      )
    );
    const mergedEducation = [
      ...profile.education,
      ...parsed.education.filter(
        (e) =>
          !existingEduKeys.has(
            `${e.degree.toLowerCase()}|${e.institution.toLowerCase()}`
          )
      ),
    ].slice(0, 10);

    const existingInterests = new Set(
      profile.interests.map((i) => i.toLowerCase())
    );
    const mergedInterests = parsed.interests
      ? [
          ...profile.interests,
          ...parsed.interests.filter(
            (i) => !existingInterests.has(i.toLowerCase())
          ),
        ].slice(0, 20)
      : profile.interests;

    const updatedProfile = await updateProfile(user.id, {
      education: mergedEducation,
      interests: mergedInterests,
      ...(parsed.experienceLevel !== undefined && parsed.experienceLevel !== null
        ? { experienceLevel: parsed.experienceLevel }
        : {}),
    });

    const updatedSkills = await listUserSkills(user.id);

    return NextResponse.json({
      profile: updatedProfile,
      skills: updatedSkills,
      addedSkillCount: newSkills.length,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
