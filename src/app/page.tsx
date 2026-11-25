import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Tech &amp; Data Career Readiness
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Bridge the gap between your skills and what employers want.
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        Explore in-demand skills across tech and data roles, compare your
        current profile against target jobs, and see what to learn next.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in with Google
        </Link>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          View Dashboard
        </Link>
      </div>
    </section>
  );
}
