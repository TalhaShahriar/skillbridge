"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AdminJobRow {
  id: string;
  title: string;
  company: string | null;
  source: string;
  roleId: string | null;
  roleOverridden: boolean;
  role: { id: string; name: string; slug: string } | null;
}

export function AdminJobsClient({
  initialJobs,
  roles,
}: {
  initialJobs: AdminJobRow[];
  roles: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<AdminJobRow[]>(initialJobs);
  const [query, setQuery] = useState("");
  const [retagging, setRetagging] = useState(false);

  const filtered = jobs.filter((j) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      j.title.toLowerCase().includes(q) ||
      (j.company ?? "").toLowerCase().includes(q)
    );
  });

  async function handleRoleChange(jobId: string, roleId: string | null) {
    if (!roleId) return;
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        job?: {
          id: string;
          roleId: string | null;
          roleOverridden: boolean;
          role: { id: string; name: string; slug: string } | null;
        };
        error?: string;
      };
      if (!res.ok || !data.job) {
        throw new Error(data.error ?? "Failed to update job role");
      }
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, ...data.job } : j))
      );
      toast.success("Job role updated");
    } catch (err) {
      toast.error((err as Error).message || "Failed to update job role");
    }
  }

  async function handleRetagAll() {
    setRetagging(true);
    try {
      const res = await fetch("/api/admin/jobs/retag", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: {
          processed: number;
          updatedRoles: number;
          totalSkillLinks: number;
        };
        error?: string;
      };
      if (!res.ok || !data.summary) {
        throw new Error(data.error ?? "Retag failed");
      }
      toast.success(
        `Retagged ${data.summary.processed} jobs (${data.summary.updatedRoles} role updates, ${data.summary.totalSkillLinks} skill links).`
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Retag failed");
    } finally {
      setRetagging(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search jobs by title or company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button type="button" onClick={handleRetagAll} disabled={retagging}>
          {retagging ? "Re-tagging..." : "Re-tag all jobs"}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No jobs match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {job.title}
                    {job.roleOverridden && (
                      <Badge variant="outline" className="ml-2">
                        Overridden
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{job.company ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {job.source}
                  </TableCell>
                  <TableCell className="w-56">
                    <Select
                      value={job.roleId ?? ""}
                      onValueChange={(val) => handleRoleChange(job.id, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
