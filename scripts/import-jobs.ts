import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import {
  ImportColumnMappingSchema,
  importJobs,
  retagAllJobs,
} from "../src/server/services/jobImport";

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--retag")) {
    const result = await retagAllJobs();
    console.log("Retag summary:", JSON.stringify(result, null, 2));
    return;
  }

  const limitRaw = getArgValue(args, "--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error(`Invalid --limit value: ${limitRaw}`);
  }

  const capRaw = getArgValue(args, "--cap");
  const perRoleCap = capRaw ? Number(capRaw) : undefined;

  if (args.includes("--sample")) {
    const samplePath = path.resolve(process.cwd(), "data/seed/sample-jobs.json");
    const rows = JSON.parse(fs.readFileSync(samplePath, "utf8")) as Record<
      string,
      unknown
    >[];
    const summary = await importJobs(rows, {
      source: "sample",
      limit,
      perRoleCap,
    });
    console.log("Import summary (sample):", JSON.stringify(summary, null, 2));
    return;
  }

  if (args.includes("--bd")) {
    const bdPath = path.resolve(process.cwd(), "data/seed/bd-jobs.json");
    const rows = JSON.parse(fs.readFileSync(bdPath, "utf8")) as Record<
      string,
      unknown
    >[];
    const summary = await importJobs(rows, {
      source: "manual-bd",
      limit,
      perRoleCap,
    });
    console.log("Import summary (manual-bd):", JSON.stringify(summary, null, 2));
    return;
  }

  const filePath = getArgValue(args, "--file");
  const source = getArgValue(args, "--source") ?? "kaggle:jobs";

  if (!filePath) {
    throw new Error(
      "Provide --file <csv-path>, --sample, --bd, or --retag"
    );
  }

  const resolvedFile = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedFile)) {
    throw new Error(`CSV file not found: ${resolvedFile}`);
  }

  const configPath = path.resolve(process.cwd(), "data/seed/import-config.json");
  const config = ImportColumnMappingSchema.parse(
    JSON.parse(fs.readFileSync(configPath, "utf8"))
  );

  const parser = fs.createReadStream(resolvedFile).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    })
  );

  const summary = await importJobs(parser, {
    source,
    limit,
    perRoleCap,
    config,
  });

  console.log("Import summary:", JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
