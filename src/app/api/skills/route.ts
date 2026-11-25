import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { apiErrorResponse } from "@/server/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    const skills = await db.skill.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              {
                aliases: {
                  some: {
                    alias: { contains: q.toLowerCase() },
                  },
                },
              },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    return NextResponse.json({ skills });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
