import { revalidateTag, unstable_cache } from "next/cache";
import { getDashboardData } from "@/server/services/dashboard";

export const getCachedDashboardData = unstable_cache(
  async (roleId?: string) => getDashboardData(roleId),
  ["dashboard-data"],
  {
    revalidate: 3600,
    tags: ["dashboard"],
  }
);

export function revalidateDashboardCache() {
  revalidateTag("dashboard", "max");
}
