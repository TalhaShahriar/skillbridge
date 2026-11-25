"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: "STUDENT" | "ADMIN";
  blocked: boolean;
  createdAt: string;
}

export function AdminUsersClient({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: AdminUserRow[];
  currentAdminId: string;
}) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<AdminUserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q)
    );
  });

  async function patchUser(
    userId: string,
    payload: { blocked?: boolean; role?: "STUDENT" | "ADMIN" }
  ) {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: AdminUserRow;
        error?: string;
      };
      if (!res.ok || !data.user) {
        throw new Error(data.error ?? "Failed to update user");
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
      toast.success("User updated");
    } catch (err) {
      toast.error((err as Error).message || "Failed to update user");
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search users by email or name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const isSelf = user.id === currentAdminId;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "ADMIN" ? "default" : "secondary"}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSelf || busyId === user.id}
                        onClick={() => setConfirmTarget(user)}
                      >
                        {user.blocked ? "Unblock" : "Block"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={
                          (isSelf && user.role === "ADMIN") ||
                          busyId === user.id
                        }
                        onClick={() =>
                          patchUser(user.id, {
                            role: user.role === "ADMIN" ? "STUDENT" : "ADMIN",
                          })
                        }
                      >
                        {user.role === "ADMIN" ? "Demote" : "Make Admin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.blocked ? "Unblock user?" : "Block user?"}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.blocked
                ? `Allow ${confirmTarget.email} to sign in again.`
                : `Prevent ${confirmTarget?.email} from accessing SkillBridge.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmTarget?.blocked ? "default" : "destructive"}
              disabled={!confirmTarget || busyId === confirmTarget.id}
              onClick={() =>
                confirmTarget &&
                patchUser(confirmTarget.id, { blocked: !confirmTarget.blocked })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
