"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleSkillInput, SkillGapResult } from "@/server/services/analysis";

interface RoleOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const WEIGHT_LABELS: Record<number, string> = {
  3: "Core",
  2: "Important",
  1: "Nice-to-have",
};

function weightVariant(weight: number): "default" | "secondary" | "outline" {
  if (weight >= 3) return "default";
  if (weight === 2) return "secondary";
  return "outline";
}

export function SkillGapClient({
  hasTargetRole,
  targetRole,
  gap,
  demandBySkillId,
  roles,
}: {
  hasTargetRole: boolean;
  targetRole: RoleOption | null;
  gap: SkillGapResult | null;
  demandBySkillId: Record<string, number>;
  roles: RoleOption[];
}) {
  const router = useRouter();
  const [updatingRole, setUpdatingRole] = useState(false);

  async function handleRoleChange(roleId: string | null) {
    if (!roleId) return;
    setUpdatingRole(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRoleId: roleId }),
      });
      if (!res.ok) throw new Error("Failed to update target role");
      toast.success("Target role updated");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Failed to update target role");
    } finally {
      setUpdatingRole(false);
    }
  }

  if (!hasTargetRole || !targetRole || !gap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose a target role</CardTitle>
          <CardDescription>
            Select the role you are aiming for to see your readiness score and
            missing skills.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-sm space-y-4">
          <Select
            value=""
            disabled={updatingRole}
            onValueChange={(val) =>
              handleRoleChange(typeof val === "string" ? val : null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a target role..." />
            </SelectTrigger>
            <SelectContent>
              {roles
                .filter((r) => r.slug !== "other")
                .map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{targetRole.name}</CardTitle>
            {targetRole.description && (
              <CardDescription className="mt-1">
                {targetRole.description}
              </CardDescription>
            )}
          </div>
          <div className="w-full sm:w-60">
            <Select
              value={targetRole.id}
              disabled={updatingRole}
              onValueChange={(val) => handleRoleChange(val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((r) => r.slug !== "other")
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Role Readiness
              </p>
              <p className="text-4xl font-bold tracking-tight">
                {gap.readinessPct}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {gap.matchedWeight} / {gap.totalWeight} weight points matched (
              {gap.matched.length} of{" "}
              {gap.matched.length + gap.missing.length} skills)
            </p>
          </div>
          <Progress value={gap.readinessPct} />
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/profile"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Update My Skills
            </Link>
            <Link
              href="/recommendations"
              className={buttonVariants({ size: "sm" })}
            >
              View Job Recommendations
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>You have ({gap.matched.length})</CardTitle>
            <CardDescription>
              Required skills already in your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gap.matched.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None of the required skills for this role are in your profile
                yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gap.matched.map((skill: RoleSkillInput) => (
                  <Badge
                    key={skill.skillId}
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Missing ({gap.missing.length})</CardTitle>
            <CardDescription>
              Sorted by importance for {targetRole.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gap.missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have all required skills for {targetRole.name}!
              </p>
            ) : (
              <div className="space-y-2.5">
                {gap.missing.map((skill: RoleSkillInput) => {
                  const demand = demandBySkillId[skill.skillId];
                  return (
                    <div
                      key={skill.skillId}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{skill.name}</span>
                        <Badge variant={weightVariant(skill.weight)}>
                          {WEIGHT_LABELS[skill.weight] ?? `Weight ${skill.weight}`}
                        </Badge>
                      </div>
                      {demand !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {demand}% of jobs
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
