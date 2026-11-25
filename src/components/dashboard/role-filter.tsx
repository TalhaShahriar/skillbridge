"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RoleFilterSelect({
  roles,
  selectedRoleId,
}: {
  roles: { id: string; name: string }[];
  selectedRoleId: string | null;
}) {
  const router = useRouter();

  function handleChange(val: string | null) {
    if (!val || val === "all") {
      router.replace("/dashboard");
      return;
    }
    router.replace(`/dashboard?roleId=${encodeURIComponent(val)}`);
  }

  return (
    <div className="w-full sm:w-64">
      <Select
        value={selectedRoleId ?? "all"}
        onValueChange={(val) => handleChange(val)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
