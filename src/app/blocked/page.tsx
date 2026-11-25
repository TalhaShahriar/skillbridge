import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function BlockedPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your account is blocked</CardTitle>
          <CardDescription>
            An administrator has disabled access for this account. If you
            believe this is a mistake, please contact your course or project
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SignOutButton />
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Back to Home
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
