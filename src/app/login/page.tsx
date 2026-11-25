import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function LoginPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to SkillBridge</CardTitle>
          <CardDescription>
            Use your Google account to save your skill profile, track readiness,
            and get job recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-9 w-full" />}>
            <GoogleSignInButton />
          </Suspense>
        </CardContent>
      </Card>
    </section>
  );
}
