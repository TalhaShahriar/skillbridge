"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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

export interface RoleSkillRow {
  skillId: string;
  name: string;
  category: string;
  weight: number;
}

export interface AdminRoleItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skills: RoleSkillRow[];
}

interface SkillSearchItem {
  id: string;
  name: string;
  category: string;
}

export function AdminRolesClient({
  initialRoles,
}: {
  initialRoles: AdminRoleItem[];
}) {
  const [roles, setRoles] = useState<AdminRoleItem[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoles[0]?.id ?? ""
  );
  const [skillQuery, setSkillQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SkillSearchItem[]>([]);
  const [newWeight, setNewWeight] = useState<1 | 2 | 3>(2);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  useEffect(() => {
    const q = skillQuery.trim();
    if (!q) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skills?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { skills: SkillSearchItem[] };
        setSearchResults(data.skills);
      } catch {
        // ignore abort
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [skillQuery]);

  async function handleUpsertSkill(skillId: string, weight: 1 | 2 | 3) {
    if (!selectedRole) return;
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, weight }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        roleSkill?: RoleSkillRow;
        error?: string;
      };
      if (!res.ok || !data.roleSkill) {
        throw new Error(data.error ?? "Failed to update role skill");
      }

      setRoles((prev) =>
        prev.map((r) => {
          if (r.id !== selectedRole.id) return r;
          const filtered = r.skills.filter((s) => s.skillId !== skillId);
          return {
            ...r,
            skills: [...filtered, data.roleSkill!].sort(
              (a, b) => b.weight - a.weight || a.name.localeCompare(b.name)
            ),
          };
        })
      );
      setSkillQuery("");
      setSearchResults([]);
      toast.success("Role skill updated");
    } catch (err) {
      toast.error((err as Error).message || "Failed to update role skill");
    }
  }

  async function handleRemoveSkill(skillId: string) {
    if (!selectedRole) return;
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/skills`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      if (!res.ok) throw new Error("Failed to remove skill");

      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id
            ? { ...r, skills: r.skills.filter((s) => s.skillId !== skillId) }
            : r
        )
      );
      toast.success("Skill removed from role");
    } catch (err) {
      toast.error((err as Error).message || "Failed to remove skill");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-72">
          <Select
            value={selectedRoleId}
            onValueChange={(val) => setSelectedRoleId(val ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.skills.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedRole?.description && (
          <p className="text-sm text-muted-foreground">
            {selectedRole.description}
          </p>
        )}
      </div>

      {selectedRole && (
        <>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <div>
              <Input
                placeholder="Add skill to this role (search by name or alias)..."
                value={skillQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSkillQuery(val);
                  if (!val.trim()) setSearchResults([]);
                }}
              />
              {searchResults.length > 0 && (
                <div className="mt-1 rounded-md border bg-popover p-1 shadow-sm">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleUpsertSkill(s.id, newWeight)}
                      className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        {s.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({s.category})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        + Add (Weight {newWeight})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Select
              value={String(newWeight)}
              onValueChange={(val) =>
                setNewWeight((Number(val) as 1 | 2 | 3) || 2)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 — Core</SelectItem>
                <SelectItem value="2">2 — Important</SelectItem>
                <SelectItem value="1">1 — Nice-to-have</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedRole.skills.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No skills assigned to this role.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedRole.skills.map((rs) => (
                    <TableRow key={rs.skillId}>
                      <TableCell className="font-medium">{rs.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rs.category}</Badge>
                      </TableCell>
                      <TableCell className="w-44">
                        <Select
                          value={String(rs.weight)}
                          onValueChange={(val) =>
                            handleUpsertSkill(
                              rs.skillId,
                              (Number(val) as 1 | 2 | 3) || 1
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 — Core</SelectItem>
                            <SelectItem value="2">2 — Important</SelectItem>
                            <SelectItem value="1">1 — Nice-to-have</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${rs.name}`}
                          onClick={() => handleRemoveSkill(rs.skillId)}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
