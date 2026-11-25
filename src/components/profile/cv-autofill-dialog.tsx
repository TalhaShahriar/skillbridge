"use client";

import { useState } from "react";
import { AlertCircle, Upload } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type {
  EducationItem,
  ExperienceLevelInput,
} from "@/server/schemas";
import type { CvProposal } from "@/server/services/cv";

const MAX_CV_BYTES = 2 * 1024 * 1024;

type Step = "upload" | "parsing" | "review";

export function CvAutofillDialog({
  currentEducation,
  currentExperienceLevel,
  currentInterests,
  currentSkillNames,
  onApplied,
}: {
  currentEducation: EducationItem[];
  currentExperienceLevel: ExperienceLevelInput;
  currentInterests: string[];
  currentSkillNames: string[];
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [proposal, setProposal] = useState<CvProposal | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedEdu, setSelectedEdu] = useState<Set<number>>(new Set());
  const [applyLevel, setApplyLevel] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set()
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(
    new Set()
  );

  function resetDialog() {
    setStep("upload");
    setFile(null);
    setErrorMsg(null);
    setProposal(null);
    setSaving(false);
  }

  async function handleParse() {
    if (!file) {
      setErrorMsg("Please select a PDF or DOCX file.");
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setErrorMsg("File exceeds 2 MB limit.");
      return;
    }

    setErrorMsg(null);
    setStep("parsing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/me/cv/parse", {
        method: "POST",
        body: formData,
      });

      const body = (await res.json().catch(() => ({}))) as {
        status?: "ok" | "scanned_or_empty";
        message?: string;
        proposal?: CvProposal;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to parse CV");
      }

      if (body.status === "scanned_or_empty") {
        setStep("upload");
        setErrorMsg(
          body.message ??
            "Could not extract enough text (scanned PDFs are unsupported). Please enter your details manually."
        );
        return;
      }

      if (!body.proposal) {
        throw new Error("Empty CV proposal returned");
      }

      setProposal(body.proposal);
      setSelectedEdu(
        new Set(body.proposal.education.map((_, idx) => idx))
      );
      setApplyLevel(Boolean(body.proposal.experienceLevel));
      setSelectedInterests(new Set(body.proposal.interests));
      setSelectedSkillIds(
        new Set(body.proposal.recognized.map((s) => s.skillId))
      );
      setStep("review");
    } catch (err) {
      setStep("upload");
      setErrorMsg((err as Error).message || "Failed to parse CV");
    }
  }

  async function handleApply() {
    if (!proposal) return;
    setSaving(true);
    try {
      const payload = {
        education: proposal.education.filter((_, idx) => selectedEdu.has(idx)),
        ...(applyLevel && proposal.experienceLevel
          ? { experienceLevel: proposal.experienceLevel }
          : {}),
        interests: proposal.interests.filter((i) => selectedInterests.has(i)),
        skills: proposal.recognized
          .filter((s) => selectedSkillIds.has(s.skillId))
          .map((s) => ({ skillId: s.skillId, level: s.level })),
      };

      const res = await fetch("/api/me/cv/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to apply CV details");
      }

      toast.success("Selected CV details applied to your profile");
      setOpen(false);
      resetDialog();
      onApplied();
    } catch (err) {
      toast.error((err as Error).message || "Failed to apply CV details");
    } finally {
      setSaving(false);
    }
  }

  function toggleSetItem<T>(set: Set<T>, item: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setter(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetDialog();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <Upload className="size-4" />
            Auto-fill from CV
          </Button>
        }
      />

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto-fill Profile from CV</DialogTitle>
          <DialogDescription>
            Upload a PDF or DOCX (max 2 MB) to review extracted details before
            saving.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Privacy Notice:</strong> Your
              CV text is sent to Google Gemini to extract details. Contact
              details (emails, phone numbers, personal URLs, and addresses) are
              removed first. The file and text are not stored.
            </div>

            <Input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setErrorMsg(null);
              }}
            />

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleParse} disabled={!file}>
                Extract Details
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "parsing" && (
          <div className="space-y-4 py-8 text-center">
            <p className="text-sm font-medium">
              Extracting text and analyzing CV...
            </p>
            <Progress value={65} />
            <p className="text-xs text-muted-foreground">
              Stripping contact details before extraction. Nothing is saved
              until you confirm.
            </p>
          </div>
        )}

        {step === "review" && proposal && (
          <div className="space-y-5 text-sm">
            {proposal.fallback && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                Gemini was temporarily unavailable; showing skills matched
                locally from your CV text.
              </div>
            )}

            <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Current Education
                </h4>
                {currentEducation.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {currentEducation.map((e, i) => (
                      <li key={i}>
                        {e.degree} — {e.institution}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  From CV (select to add)
                </h4>
                {proposal.education.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None found</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {proposal.education.map((e, idx) => (
                      <label key={idx} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEdu.has(idx)}
                          onChange={() =>
                            toggleSetItem(selectedEdu, idx, setSelectedEdu)
                          }
                        />
                        <span>
                          {e.degree} — {e.institution}{" "}
                          {e.year ? `(${e.year})` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Current Level
                </h4>
                <p className="text-xs">{currentExperienceLevel}</p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  From CV
                </h4>
                {proposal.experienceLevel ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={applyLevel}
                      onChange={(e) => setApplyLevel(e.target.checked)}
                    />
                    <span>{proposal.experienceLevel}</span>
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">Not detected</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Current Interests
                </h4>
                <p className="text-xs text-muted-foreground">
                  {currentInterests.length > 0
                    ? currentInterests.join(", ")
                    : "None"}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  From CV (select to add)
                </h4>
                {proposal.interests.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None found</p>
                ) : (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {proposal.interests.map((interest) => (
                      <label
                        key={interest}
                        className="flex items-center gap-1.5 rounded border px-2 py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedInterests.has(interest)}
                          onChange={() =>
                            toggleSetItem(
                              selectedInterests,
                              interest,
                              setSelectedInterests
                            )
                          }
                        />
                        <span>{interest}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Current Skills ({currentSkillNames.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  {currentSkillNames.length > 0
                    ? currentSkillNames.slice(0, 12).join(", ") +
                      (currentSkillNames.length > 12 ? "..." : "")
                    : "None"}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  From CV ({proposal.recognized.length} matched)
                </h4>
                {proposal.recognized.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No catalog skills matched.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {proposal.recognized.map((s) => (
                      <label
                        key={s.skillId}
                        className="flex items-center gap-1.5 rounded border px-2 py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkillIds.has(s.skillId)}
                          onChange={() =>
                            toggleSetItem(
                              selectedSkillIds,
                              s.skillId,
                              setSelectedSkillIds
                            )
                          }
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {proposal.unrecognized.length > 0 && (
              <div className="rounded-lg border border-dashed p-3">
                <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  Unrecognized Terms (not in catalog, informational only)
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {proposal.unrecognized.map((term) => (
                    <Badge key={term} variant="secondary">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={saving}
              >
                Back
              </Button>
              <Button type="button" onClick={handleApply} disabled={saving}>
                {saving ? "Saving..." : "Save selected"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
