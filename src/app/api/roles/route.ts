import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiErrorResponse } from "@/server/lib/api-error";

export async function GET() {
  try {
    const roles = await db.jobRole.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
