import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { revalidateDashboardCache } from "@/server/cache/dashboard";
import { apiErrorResponse } from "@/server/lib/api-error";
import { AdminServiceError } from "@/server/services/admin";
import {
  ImportColumnMappingSchema,
  importJobs,
} from "@/server/services/jobImport";

const MAX_CSV_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel body limit)

const SampleBodySchema = z.object({
  mode: z.literal("sample"),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      SampleBodySchema.parse(body);

      const samplePath = path.resolve(
        process.cwd(),
        "data/seed/sample-jobs.json"
      );
      const rows = JSON.parse(fs.readFileSync(samplePath, "utf8")) as Record<
        string,
        unknown
      >[];

      const summary = await importJobs(rows, { source: "sample" });
      revalidateDashboardCache();
      return NextResponse.json({ summary });
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const sourceRaw = formData.get("source");
      const source =
        typeof sourceRaw === "string" && sourceRaw.trim()
          ? sourceRaw.trim()
          : "kaggle:upload";

      if (!(file instanceof File)) {
        throw new AdminServiceError("CSV file is required", 400);
      }
      if (file.size > MAX_CSV_BYTES) {
        throw new AdminServiceError(
          "CSV file exceeds 4 MB limit. Use the CLI for larger imports.",
          400
        );
      }

      const csvText = await file.text();
      const rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      }) as Record<string, unknown>[];

      const configPath = path.resolve(
        process.cwd(),
        "data/seed/import-config.json"
      );
      const config = ImportColumnMappingSchema.parse(
        JSON.parse(fs.readFileSync(configPath, "utf8"))
      );

      const summary = await importJobs(rows, {
        source,
        config,
        limit: 1000,
      });
      revalidateDashboardCache();
      return NextResponse.json({ summary });
    }

    throw new AdminServiceError("Unsupported content type", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
