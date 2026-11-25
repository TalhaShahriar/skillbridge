"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatJobSourceLabel } from "@/lib/format";

export interface JobListItem {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  workMode: string;
  level: string;
  source: string;
  role: { id: string; name: string; slug: string } | null;
  skills: { id: string; name: string; category: string }[];
}

interface RoleOption {
  id: string;
  name: string;
}

const WORK_MODE_OPTIONS = [
  { value: "all", label: "All work modes" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On-site" },
  { value: "UNKNOWN", label: "Unspecified" },
];

const LEVEL_OPTIONS = [
  { value: "all", label: "All levels" },
  { value: "INTERN", label: "Intern" },
  { value: "ENTRY", label: "Entry / Junior" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior / Lead" },
  { value: "UNKNOWN", label: "Unspecified" },
];

// UNKNOWN is intentionally omitted so cards don't show "Unspecified" noise.
const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const LEVEL_LABEL: Record<string, string> = {
  INTERN: "Intern",
  ENTRY: "Entry / Junior",
  MID: "Mid-level",
  SENIOR: "Senior / Lead",
};

export function JobsBrowserClient({
  items,
  total,
  page,
  totalPages,
  pageSize,
  datasetName,
  roles,
  initialFilters,
}: {
  items: JobListItem[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  datasetName: string;
  roles: RoleOption[];
  initialFilters: {
    q: string;
    roleId: string;
    workMode: string;
    level: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(initialFilters.q);
  const [isPending, startTransition] = useTransition();

  function navigate(qs: string) {
    startTransition(() => {
      router.replace(qs ? `/jobs?${qs}` : "/jobs");
    });
  }

  useEffect(() => {
    const trimmed = queryInput.trim();
    const currentQ = searchParams.get("q") ?? "";
    if (trimmed === currentQ) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }
      next.delete("page");
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `/jobs?${qs}` : "/jobs");
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [queryInput, router, searchParams]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== "page") {
      next.delete("page");
    }
    navigate(next.toString());
  }

  function clearAllFilters() {
    setQueryInput("");
    navigate("");
  }

  const hasFilters =
    Boolean(initialFilters.q) ||
    Boolean(initialFilters.roleId) ||
    Boolean(initialFilters.workMode) ||
    Boolean(initialFilters.level);

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(rangeStart + items.length - 1, total);

  return (
    <div className="space-y-6">
      <form
        role="search"
        aria-label="Filter jobs"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 md:grid-cols-[1fr_200px_170px_170px]"
      >
        <div className="relative">
          <Label htmlFor="jobs-search" className="sr-only">
            Search jobs
          </Label>
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            id="jobs-search"
            type="search"
            maxLength={120}
            placeholder="Search title, company, or skill (e.g. React, SQL)..."
            className="pl-8"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>

        <Select
          value={initialFilters.roleId || "all"}
          onValueChange={(val) => updateFilter("roleId", val ?? "all")}
        >
          <SelectTrigger className="w-full" aria-label="Role">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initialFilters.workMode || "all"}
          onValueChange={(val) => updateFilter("workMode", val ?? "all")}
        >
          <SelectTrigger className="w-full" aria-label="Work mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORK_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initialFilters.level || "all"}
          onValueChange={(val) => updateFilter("level", val ?? "all")}
        >
          <SelectTrigger className="w-full" aria-label="Experience level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>
          <p role="status" aria-live="polite">
            {isPending
              ? "Updating results…"
              : items.length === 0
                ? "0 jobs"
                : `Showing ${rangeStart}–${rangeEnd} of ${total} job${total === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs">
            Source: {datasetName} · {total} posting{total === 1 ? "" : "s"}{" "}
            {hasFilters ? "match these filters" : "in this dataset"}
          </p>
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            <X className="size-4" />
            Clear filters
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {total > 0 ? "This page is out of range" : "No jobs found"}
            </CardTitle>
            <CardDescription>
              {total > 0
                ? `There ${totalPages === 1 ? "is only 1 page" : `are only ${totalPages} pages`} of results.`
                : hasFilters
                  ? "No postings match these filters. Try a broader search or clear the filters."
                  : "No jobs have been imported yet."}
            </CardDescription>
          </CardHeader>
          {(total > 0 || hasFilters) && (
            <CardContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={
                  total > 0 ? () => updateFilter("page", "1") : clearAllFilters
                }
              >
                {total > 0 ? "Go to first page" : "Clear filters"}
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <div
          className={`space-y-4 transition-opacity ${isPending ? "opacity-60" : ""}`}
          aria-busy={isPending}
        >
          {items.map((job) => (
            <Card key={job.id}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {job.title}
                    </Link>
                    {job.role && (
                      <Badge variant="secondary">{job.role.name}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {[
                      job.company,
                      job.location,
                      WORK_MODE_LABEL[job.workMode],
                      LEVEL_LABEL[job.level],
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </CardDescription>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatJobSourceLabel(job.source, datasetName)}
                </span>
              </CardHeader>

              {job.skills.length > 0 && (
                <CardContent
                  className="flex flex-wrap gap-1.5"
                  aria-label="Extracted skills"
                >
                  {job.skills.slice(0, 12).map((skill) => (
                    <Badge key={skill.id} variant="outline">
                      {skill.name}
                    </Badge>
                  ))}
                  {job.skills.length > 12 && (
                    <Badge variant="outline">
                      +{job.skills.length - 12} more
                    </Badge>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t pt-4"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => updateFilter("page", String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => updateFilter("page", String(page + 1))}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
