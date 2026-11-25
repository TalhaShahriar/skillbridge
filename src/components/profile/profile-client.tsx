"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CvAutofillDialog } from "@/components/profile/cv-autofill-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EducationItem,
  ExperienceLevelInput,
  SkillLevelInput,
} from "@/server/schemas";

export interface ProfileUserProp {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface ProfileDataProp {
  education: EducationItem[];
  experienceLevel: ExperienceLevelInput | null;
  interests: string[];
  targetRoleId: string | null;
}

export interface UserSkillItemProp {
  skillId: string;
  level: SkillLevelInput;
  name: string;
  category: string;
}

export interface RoleOptionProp {
  id: string;
  name: string;
  slug: string;
}

interface SkillSearchResult {
  id: string;
  name: string;
  category: string;
}

const EXPERIENCE_LABELS: Record<ExperienceLevelInput, string> = {
  INTERN: "Intern",
  ENTRY: "Entry / Junior",
  MID: "Mid-level",
  SENIOR: "Senior / Lead",
  UNKNOWN: "Not specified",
};

const SKILL_LEVEL_LABELS: Record<SkillLevelInput, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export function ProfileClient({
  user,
  initialProfile,
  initialSkills,
  roles,
}: {
  user: ProfileUserProp;
  initialProfile: ProfileDataProp;
  initialSkills: UserSkillItemProp[];
  roles: RoleOptionProp[];
}) {
  const router = useRouter();
  const [education, setEducation] = useState<EducationItem[]>(
    initialProfile.education
  );
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevelInput>(initialProfile.experienceLevel ?? "UNKNOWN");
  const [interests, setInterests] = useState<string[]>(
    initialProfile.interests
  );
  const [interestInput, setInterestInput] = useState("");
  const [targetRoleId, setTargetRoleId] = useState<string>(
    initialProfile.targetRoleId ?? "none"
  );
  const [savingProfile, setSavingProfile] = useState(false);

  const [skills, setSkills] = useState<UserSkillItemProp[]>(initialSkills);
  const [skillQuery, setSkillQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SkillSearchResult[]>([]);
  const [searchingSkills, setSearchingSkills] = useState(false);
  const [newSkillLevel, setNewSkillLevel] =
    useState<SkillLevelInput>("BEGINNER");
  const [addingSkillId, setAddingSkillId] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = skillQuery.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearchingSkills(true);
      try {
        const res = await fetch(
          `/api/skills?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to search skills");
        const data = (await res.json()) as { skills: SkillSearchResult[] };
        setSearchResults(data.skills);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSearchResults([]);
        }
      } finally {
        setSearchingSkills(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [skillQuery]);

  const groupedSkills = useMemo(() => {
    const groups = new Map<string, UserSkillItemProp[]>();
    for (const skill of skills) {
      const list = groups.get(skill.category) ?? [];
      list.push(skill);
      groups.set(skill.category, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [skills]);

  const ownedSkillIds = useMemo(
    () => new Set(skills.map((s) => s.skillId)),
    [skills]
  );

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const cleanedEducation = education.filter(
        (e) => e.degree.trim() && e.institution.trim()
      );
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          education: cleanedEducation,
          experienceLevel,
          interests,
          targetRoleId: targetRoleId === "none" ? null : targetRoleId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save profile");
      }
      setEducation(cleanedEducation);
      toast.success("Profile saved");
    } catch (err) {
      toast.error((err as Error).message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleAddEducationRow() {
    setEducation((prev) => [
      ...prev,
      { degree: "", institution: "", year: "" },
    ]);
  }

  function handleUpdateEducation(
    index: number,
    field: keyof EducationItem,
    value: string
  ) {
    setEducation((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function handleRemoveEducation(index: number) {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddInterest() {
    const trimmed = interestInput.trim();
    if (!trimmed) return;
    if (interests.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setInterestInput("");
      return;
    }
    setInterests((prev) => [...prev, trimmed]);
    setInterestInput("");
  }

  async function handleAddSkill(candidate: SkillSearchResult) {
    setAddingSkillId(candidate.id);
    try {
      const res = await fetch("/api/me/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: [{ skillId: candidate.id, level: newSkillLevel }],
        }),
      });
      if (!res.ok) throw new Error("Failed to add skill");
      const data = (await res.json()) as { added: UserSkillItemProp[] };
      if (data.added.length > 0) {
        setSkills((prev) => {
          const filtered = prev.filter(
            (s) => !data.added.some((a) => a.skillId === s.skillId)
          );
          return [...filtered, ...data.added];
        });
        toast.success(`Added ${candidate.name}`);
      }
      setSkillQuery("");
      setSearchResults([]);
    } catch (err) {
      toast.error((err as Error).message || "Failed to add skill");
    } finally {
      setAddingSkillId(null);
    }
  }

  async function handleUpdateSkillLevel(
    skillId: string,
    level: SkillLevelInput
  ) {
    const prev = skills;
    setSkills((curr) =>
      curr.map((s) => (s.skillId === skillId ? { ...s, level } : s))
    );
    try {
      const res = await fetch(`/api/me/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) throw new Error("Failed to update skill level");
      toast.success("Skill level updated");
    } catch (err) {
      setSkills(prev);
      toast.error((err as Error).message || "Failed to update skill level");
    }
  }

  async function handleRemoveSkill(skillId: string, name: string) {
    const prev = skills;
    setSkills((curr) => curr.filter((s) => s.skillId !== skillId));
    try {
      const res = await fetch("/api/me/skills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillIds: [skillId] }),
      });
      if (!res.ok) throw new Error("Failed to remove skill");
      toast.success(`Removed ${name}`);
    } catch (err) {
      setSkills(prev);
      toast.error((err as Error).message || "Failed to remove skill");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name ?? user.email}
                className="size-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-base font-semibold">
                {(user.name ?? user.email)[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div>
              <CardTitle>{user.name ?? "Student Profile"}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>

          <CvAutofillDialog
            currentEducation={education}
            currentExperienceLevel={experienceLevel}
            currentInterests={interests}
            currentSkillNames={skills.map((s) => s.name)}
            onApplied={() => router.refresh()}
          />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target-role">Target Role</Label>
              <Select
                value={targetRoleId}
                onValueChange={(val) => setTargetRoleId(val ?? "none")}
              >
                <SelectTrigger id="target-role" className="w-full">
                  <SelectValue placeholder="Select target role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No target role selected</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience-level">Experience Level</Label>
              <Select
                value={experienceLevel}
                onValueChange={(val) =>
                  setExperienceLevel((val as ExperienceLevelInput) ?? "UNKNOWN")
                }
              >
                <SelectTrigger id="experience-level" className="w-full">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(EXPERIENCE_LABELS) as ExperienceLevelInput[]
                  ).map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {EXPERIENCE_LABELS[lvl]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest-input">Interests</Label>
            <div className="flex gap-2">
              <Input
                id="interest-input"
                placeholder="e.g. Backend APIs, Data Visualization"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddInterest}
              >
                Add
              </Button>
            </div>
            {interests.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {interests.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    {item}
                    <button
                      type="button"
                      aria-label={`Remove ${item}`}
                      onClick={() =>
                        setInterests((prev) => prev.filter((i) => i !== item))
                      }
                      className="ml-1 rounded-full hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No interests added yet.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Education</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEducationRow}
              >
                <Plus className="size-4" />
                Add Education
              </Button>
            </div>

            {education.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No education entries added yet.
              </p>
            ) : (
              <div className="space-y-2">
                {education.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_110px_auto]"
                  >
                    <Input
                      placeholder="Degree (e.g. BSc in CSE)"
                      value={row.degree}
                      onChange={(e) =>
                        handleUpdateEducation(idx, "degree", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Institution"
                      value={row.institution}
                      onChange={(e) =>
                        handleUpdateEducation(
                          idx,
                          "institution",
                          e.target.value
                        )
                      }
                    />
                    <Input
                      placeholder="Year"
                      value={row.year}
                      onChange={(e) =>
                        handleUpdateEducation(idx, "year", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove education row"
                      onClick={() => handleRemoveEducation(idx)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Skills</CardTitle>
          <CardDescription>
            Search and add skills you already know. Your skills power your
            readiness score and job recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_170px]">
            <div className="relative">
              <Input
                placeholder="Search skills (e.g. React, Python, PostgreSQL, k8s)..."
                value={skillQuery}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setSkillQuery(nextVal);
                  if (!nextVal.trim()) {
                    setSearchResults([]);
                    setSearchingSkills(false);
                  }
                }}
              />
              {(searchingSkills || searchResults.length > 0) && (
                <div className="mt-1 rounded-md border bg-popover p-1 shadow-sm">
                  {searchingSkills ? (
                    <div className="space-y-1 p-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-3/4" />
                    </div>
                  ) : (
                    searchResults.map((item) => {
                      const alreadyOwned = ownedSkillIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={addingSkillId === item.id}
                          onClick={() => handleAddSkill(item)}
                          className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                        >
                          <span>
                            {item.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({item.category})
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {alreadyOwned ? "Update level" : "+ Add"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <Select
              value={newSkillLevel}
              onValueChange={(val) =>
                setNewSkillLevel((val as SkillLevelInput) ?? "BEGINNER")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevelInput[]).map(
                  (lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {SKILL_LEVEL_LABELS[lvl]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {skills.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              You haven&apos;t added any skills yet. Use the search box above to
              add your first skill.
            </div>
          ) : (
            <div className="space-y-5">
              {groupedSkills.map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {category} ({items.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <div
                        key={skill.skillId}
                        className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-sm"
                      >
                        <span className="font-medium">{skill.name}</span>
                        <Select
                          value={skill.level}
                          onValueChange={(val) =>
                            handleUpdateSkillLevel(
                              skill.skillId,
                              (val as SkillLevelInput) ?? skill.level
                            )
                          }
                        >
                          <SelectTrigger className="h-6 border-0 bg-muted px-2 text-xs shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(
                                SKILL_LEVEL_LABELS
                              ) as SkillLevelInput[]
                            ).map((lvl) => (
                              <SelectItem key={lvl} value={lvl}>
                                {SKILL_LEVEL_LABELS[lvl]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          aria-label={`Remove ${skill.name}`}
                          onClick={() =>
                            handleRemoveSkill(skill.skillId, skill.name)
                          }
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
