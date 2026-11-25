"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportSummary {
  read: number;
  imported: number;
  skippedNonTech: number;
  skippedInvalid: number;
  perRole: Record<string, number>;
}

const MAX_CSV_BYTES = 4 * 1024 * 1024;

export function AdminImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("kaggle:upload");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleCsvUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      toast.error("File exceeds 4 MB limit. Use the CLI for larger imports.");
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source.trim() || "kaggle:upload");

      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: ImportSummary;
        error?: string;
      };
      if (!res.ok || !data.summary) {
        throw new Error(data.error ?? "Import failed");
      }
      setSummary(data.summary);
      toast.success(`Imported ${data.summary.imported} jobs`);
    } catch (err) {
      toast.error((err as Error).message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSampleImport() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sample" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: ImportSummary;
        error?: string;
      };
      if (!res.ok || !data.summary) {
        throw new Error(data.error ?? "Sample import failed");
      }
      setSummary(data.summary);
      toast.success(`Imported ${data.summary.imported} sample jobs`);
    } catch (err) {
      toast.error((err as Error).message || "Sample import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV (max 4 MB)</CardTitle>
            <CardDescription>
              Parses in memory using <code>data/seed/import-config.json</code>.
              For larger Kaggle CSVs, use the CLI:{" "}
              <code>npm run import:jobs -- --file data/raw/jobs.csv</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCsvUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-source">Source Label</Label>
                <Input
                  id="csv-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="kaggle:tech-jobs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button type="submit" disabled={busy || !file}>
                {busy ? "Importing..." : "Upload & Import CSV"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample Dataset</CardTitle>
            <CardDescription>
              Import the 60 fictional sample postings from{" "}
              <code>data/seed/sample-jobs.json</code> (labelled as{" "}
              <code>sample</code> in the UI).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleSampleImport}
            >
              {busy ? "Importing..." : "Import Sample Data (60 jobs)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-6">
              <span>Read: {summary.read}</span>
              <span>Imported: {summary.imported}</span>
              <span>Skipped (non-tech): {summary.skippedNonTech}</span>
              <span>Skipped (invalid): {summary.skippedInvalid}</span>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(summary.perRole, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
