"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JobsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Card role="alert">
        <CardHeader>
          <CardTitle>Couldn&apos;t load jobs</CardTitle>
          <CardDescription>
            Something went wrong while fetching job postings. Your filters are
            still in the URL, so retrying reloads the same results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
