import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col justify-center px-4 py-24 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">404 — Page Not Found</CardTitle>
          <CardDescription>
            The page you are looking for does not exist or may have moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Home
          </Link>
          <Link href="/dashboard" className={buttonVariants()}>
            Dashboard
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
