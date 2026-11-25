"use client";

import { useEffect, useState } from "react";
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

export function JobsBrowserClient({
  items,
  total,
  page,
  totalPages,
  datasetName,
  roles,
  initialFilters,
}: {
  items: JobListItem[];
  total: number;
  page: number;
  totalPages: number;
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
      router.replace(qs ? `/jobs?${qs}` : "/jobs");
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
    const qs = next.toString();
    router.replace(qs ? `/jobs?${qs}` : "/jobs");
  }

  function clearAllFilters() {
    setQueryInput("");
    router.replace("/jobs");
  }

  const hasFilters =
    Boolean(initialFilters.q) ||
    Boolean(initialFilters.roleId) ||
    Boolean(initialFilters.workMode) ||
    Boolean(initialFilters.level);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1fr_200px_170px_170px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
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
          <SelectTrigger className="w-full">
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
          <SelectTrigger className="w-full">
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
          <SelectTrigger className="w-full">
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Showing {items.length} of {total} job{total === 1 ? "" : "s"}
        </span>
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
            <CardTitle>No jobs found</CardTitle>
            <CardDescription>
              Try adjusting your search or filters, or check back after jobs are
              imported.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
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
                    {job.source === "sample" && (
                      <Badge variant="outline">Sample</Badge>
                    )}
                    {job.source === "manual-bd" && (
                      <Badge variant="outline">manual-bd</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {[job.company, job.location, job.workMode, job.level]
                      .filter(Boolean)
                      .join(" · ")}
                  </CardDescription>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatJobSourceLabel(job.source, datasetName)}
                </span>
              </CardHeader>

              {job.skills.length > 0 && (
                <CardContent className="flex flex-wrap gap-1.5">
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
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
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
            disabled={page >= totalPages}
            onClick={() => updateFilter("page", String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
