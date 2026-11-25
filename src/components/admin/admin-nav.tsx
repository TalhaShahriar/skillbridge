import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/roles", label: "Roles & Weights" },
  { href: "/admin/import", label: "Import" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
      {ADMIN_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={buttonVariants({
            variant: active === tab.href ? "default" : "outline",
            size: "sm",
          })}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
