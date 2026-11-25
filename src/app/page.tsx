import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  {
    step: "01",
    title: "Add Skills or Upload CV",
    description:
      "Select skills from 185+ curated tech & data terms or auto-fill from a PDF/DOCX CV with contact details stripped first.",
  },
  {
    step: "02",
    title: "Measure Role Readiness",
    description:
      "Pick a target role and see your weighted readiness %, matched skills, and missing Core or Important skills.",
  },
  {
    step: "03",
    title: "Discover Best-Fit Jobs",
    description:
      "Browse postings ranked by weighted skill overlap, or ask the SkillBridge Assistant in plain English.",
  },
];

const FEATURES = [
  {
    icon: BarChart3,
    title: "Market Skill Demand",
    description:
      "Interactive charts showing top in-demand skills, role distribution, work modes, and experience levels.",
    href: "/dashboard",
    cta: "Open Dashboard",
  },
  {
    icon: Target,
    title: "Target Role Skill Gap",
    description:
      "Weighted readiness score comparing your profile against Core, Important, and Nice-to-have role requirements.",
    href: "/skill-gap",
    cta: "Check Skill Gap",
  },
  {
    icon: Briefcase,
    title: "Weighted Job Matching",
    description:
      "Every job shows your match %, green matching skills, and missing skills so you know why it fits.",
    href: "/recommendations",
    cta: "View Recommendations",
  },
  {
    icon: FileText,
    title: "Privacy-First CV Auto-Fill",
    description:
      "Emails, phones, URLs, and addresses are removed before extraction. Review everything before saving.",
    href: "/profile",
    cta: "Go to Profile",
  },
  {
    icon: Sparkles,
    title: "SkillBridge Assistant",
    description:
      "Update skills, set target roles, or search jobs in English—with confirmation before any destructive change.",
    href: "/assistant",
    cta: "Open Assistant",
  },
  {
    icon: CheckCircle2,
    title: "Transparent, No-ML Scoring",
    description:
      "Deterministic alias matching and weighted formulas—every score is explainable and source-attributed.",
    href: "/jobs",
    cta: "Browse Jobs",
  },
];

const ROLES_PREVIEW = [
  "Frontend Developer",
  "Backend Developer",
  "Full-stack Developer",
  "Mobile Developer",
  "DevOps Engineer",
  "QA Engineer",
  "Data Analyst",
  "Data Scientist",
  "ML Engineer",
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-20 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            Tech &amp; Data Career Readiness · Students &amp; Fresh Grads
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Bridge the gap between your skills and what employers want.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            SkillBridge maps tech and data job postings to 185+ curated skills,
            calculates your weighted readiness for your target role, and ranks
            jobs by skill match.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Sign in with Google
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Explore Dashboard
            </Link>
            <Link
              href="/jobs"
              className={buttonVariants({ variant: "ghost", size: "lg" })}
            >
              Browse Jobs
            </Link>
          </div>

          <div className="grid max-w-md grid-cols-3 gap-4 border-t pt-5">
            <div>
              <p className="text-2xl font-semibold tracking-tight">185+</p>
              <p className="text-xs text-muted-foreground">Skills &amp; aliases</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">10</p>
              <p className="text-xs text-muted-foreground">Tech &amp; data roles</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">0%</p>
              <p className="text-xs text-muted-foreground">Black-box ML</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Example Skill Gap Preview
            </span>
            <Badge variant="outline" className="text-[11px]">
              Illustrative
            </Badge>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <CardDescription className="text-xs">
                      Target Role
                    </CardDescription>
                    <CardTitle className="text-lg">Backend Developer</CardTitle>
                  </div>
                  <span className="text-2xl font-bold tracking-tight">68%</span>
                </div>
                <Progress value={68} className="mt-2" />
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <p className="font-medium text-muted-foreground">You have</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Node.js", "TypeScript", "PostgreSQL", "REST APIs"].map(
                      (s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        >
                          {s}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="font-medium text-muted-foreground">
                    Missing (learn next)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">Docker · Core</Badge>
                    <Badge variant="secondary">Redis · Important</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
                <div>
                  <CardTitle className="text-sm">
                    Junior Backend Engineer
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Remote · Entry-level
                  </CardDescription>
                </div>
                <Badge>84% match</Badge>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            How SkillBridge works
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Go from an empty profile to a clear learning plan in three steps.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((item) => (
            <Card key={item.step} className="bg-muted/20">
              <CardHeader>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  STEP {item.step}
                </span>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Everything built into SkillBridge
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public market insights for guests, plus personalized analysis when
            you sign in.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={feature.href}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {feature.cta}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/30 p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              Tracked Tech &amp; Data Career Tracks
            </h2>
            <p className="text-sm text-muted-foreground">
              Each track defines Core, Important, and Nice-to-have skills to
              calculate your readiness percentage.
            </p>
          </div>
          <Link
            href="/login"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            Get Started
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ROLES_PREVIEW.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
