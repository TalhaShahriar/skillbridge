import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { apiErrorResponse } from "@/server/lib/api-error";
import { SearchQueryParamSchema } from "@/server/schemas";

export async function GET(request: NextRequest) {
  try {
    const { q } = SearchQueryParamSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });

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
