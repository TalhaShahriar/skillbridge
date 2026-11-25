import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageUser } from "@/server/auth";
import { db } from "@/server/db";
import { getProfile, listUserSkills } from "@/server/services/profile";
import { ProfileClient } from "@/components/profile/profile-client";

async function ProfileContent() {
  const user = await requirePageUser();
  const [{ profile }, userSkills, roles] = await Promise.all([
    getProfile(user.id),
    listUserSkills(user.id),
    db.jobRole.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ProfileClient
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }}
      initialProfile={{
        education: profile.education,
        experienceLevel: profile.experienceLevel,
        interests: profile.interests,
        targetRoleId: profile.targetRoleId,
      }}
      initialSkills={userSkills}
      roles={roles}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile &amp; Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your target role, background, and technical skills.
        </p>
      </div>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </section>
  );
}
