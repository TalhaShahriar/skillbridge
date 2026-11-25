import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">403 — Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/dashboard" className={buttonVariants()}>
            Go to Dashboard
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
