import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGenerateJson,
  mockAddSkills,
  mockRemoveSkills,
  mockSetTargetRole,
  mockGetSkillGapForUser,
  mockRecommendJobs,
  mockUpdateAdminUser,
  mockListJobs,
  mockGetSkillMatcher,
  mockLogCreate,
  mockLogCount,
  mockRoleFindMany,
  mockProfileFindUnique,
  mockUserFindUnique,
} = vi.hoisted(() => ({
  mockGenerateJson: vi.fn(),
  mockAddSkills: vi.fn(),
  mockRemoveSkills: vi.fn(),
  mockSetTargetRole: vi.fn(),
  mockGetSkillGapForUser: vi.fn(),
  mockRecommendJobs: vi.fn(),
  mockUpdateAdminUser: vi.fn(),
  mockListJobs: vi.fn(),
  mockGetSkillMatcher: vi.fn(),
  mockLogCreate: vi.fn(),
  mockLogCount: vi.fn(),
  mockRoleFindMany: vi.fn(),
  mockProfileFindUnique: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock("@/server/lib/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/server/lib/gemini")>(
    "@/server/lib/gemini"
  );
  return {
    ...actual,
    generateJson: mockGenerateJson,
  };
});

vi.mock("@/server/db", () => ({
  db: {
    assistantLog: {
      create: mockLogCreate,
      count: mockLogCount,
    },
    jobRole: {
      findMany: mockRoleFindMany,
    },
    profile: {
      findUnique: mockProfileFindUnique,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("@/server/services/profile", () => ({
  addSkills: mockAddSkills,
  removeSkills: mockRemoveSkills,
  setTargetRole: mockSetTargetRole,
}));

vi.mock("@/server/services/analysis", () => ({
  getSkillGapForUser: mockGetSkillGapForUser,
  recommendJobs: mockRecommendJobs,
}));

vi.mock("@/server/services/admin", () => ({
  updateAdminUser: mockUpdateAdminUser,
}));

vi.mock("@/server/services/jobs", () => ({
  listJobs: mockListJobs,
}));

vi.mock("@/server/services/skillCache", () => ({
  getSkillMatcher: mockGetSkillMatcher,
}));

import {
  GeminiOutputError,
  GeminiUnavailableError,
} from "@/server/lib/gemini";
import {
  runAssistant,
  signConfirmToken,
  verifyConfirmToken,
} from "@/server/services/assistant/run";

const studentUser = {
  id: "u_student",
  email: "student@example.com",
  role: "STUDENT" as const,
};

const adminUser = {
  id: "u_admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("runAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogCount.mockResolvedValue(0);
    mockRoleFindMany.mockResolvedValue([
      { id: "r_fe", name: "Frontend Developer", slug: "frontend-developer" },
      { id: "r_da", name: "Data Analyst", slug: "data-analyst" },
    ]);
    mockProfileFindUnique.mockResolvedValue({
      targetRole: { name: "Frontend Developer" },
    });
    mockGetSkillMatcher.mockResolvedValue({
      normalize: (term: string) =>
        term.toLowerCase() === "react" ? "sk_react" : null,
      extract: () => [],
    });
  });

  it("executes valid add_skills action and surfaces unrecognized skills", async () => {
    mockGenerateJson.mockResolvedValue({
      action: "add_skills",
      args: {
        skills: [
          { name: "React", level: "INTERMEDIATE" },
          { name: "UnknownXYZ" },
        ],
      },
      reply: "I updated your skills.",
    });
    mockAddSkills.mockResolvedValue({
      added: [{ skillId: "sk_react", name: "React", level: "INTERMEDIATE" }],
      unrecognized: ["UnknownXYZ"],
    });

    const res = await runAssistant(studentUser, "Add React intermediate and UnknownXYZ");
    expect(res.status).toBe("ok");
    expect(res.action).toBe("add_skills");
    expect(res.data).toEqual({
      added: [{ skillId: "sk_react", name: "React", level: "INTERMEDIATE" }],
      unrecognized: ["UnknownXYZ"],
    });
    expect(mockLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ok", action: "add_skills" }),
      })
    );
  });

  it("rejects invalid JSON output from Gemini", async () => {
    mockGenerateJson.mockRejectedValue(new GeminiOutputError("bad json"));

    const res = await runAssistant(studentUser, "Do something");
    expect(res.status).toBe("rejected");
    expect(res.action).toBeNull();
  });

  it("handles GeminiUnavailableError gracefully", async () => {
    mockGenerateJson.mockRejectedValue(new GeminiUnavailableError());

    const res = await runAssistant(studentUser, "Show my skill gap");
    expect(res.status).toBe("error");
    expect(res.reply).toContain("temporarily unavailable");
  });

  it("rejects non-whitelisted actions", async () => {
    mockGenerateJson.mockResolvedValue({
      action: "drop_database",
      args: {},
      reply: "Dropping!",
    });

    const res = await runAssistant(studentUser, "Drop everything");
    expect(res.status).toBe("rejected");
    expect(res.action).toBe("drop_database");
  });

  it("rejects admin actions when called by a student", async () => {
    mockGenerateJson.mockResolvedValue({
      action: "block_user",
      args: { email: "other@example.com" },
      reply: "Blocking user.",
    });

    const res = await runAssistant(studentUser, "Block other@example.com");
    expect(res.status).toBe("rejected");
    expect(res.action).toBe("block_user");
    expect(mockUpdateAdminUser).not.toHaveBeenCalled();
  });

  it("enforces confirm flow for destructive actions (pending -> valid token -> tampered/expired)", async () => {
    mockGenerateJson.mockResolvedValue({
      action: "remove_skills",
      args: { skills: ["React"] },
      reply: "Please confirm removing React.",
    });
    mockRemoveSkills.mockResolvedValue({ removedCount: 1 });

    // 1. Without token -> confirm_pending
    const pending = await runAssistant(studentUser, "Remove React");
    expect(pending.status).toBe("confirm_pending");
    const { confirmToken } = pending.data as { confirmToken: string };
    expect(typeof confirmToken).toBe("string");
    expect(mockRemoveSkills).not.toHaveBeenCalled();

    // 2. With valid token -> executes
    const executed = await runAssistant(studentUser, "Remove React", {
      confirmToken,
    });
    expect(executed.status).toBe("ok");
    expect(mockRemoveSkills).toHaveBeenCalledWith("u_student", ["sk_react"]);

    // 3. With tampered token -> rejected
    const tampered = await runAssistant(studentUser, "Remove React", {
      confirmToken: `${confirmToken}tamper`,
    });
    expect(tampered.status).toBe("rejected");

    // 4. Expired token -> rejected
    const expiredToken = signConfirmToken({
      userId: studentUser.id,
      action: "remove_skills",
      args: { skills: ["React"] },
      reply: "Confirm",
      exp: Date.now() - 1000,
    });
    expect(verifyConfirmToken(expiredToken, studentUser.id)).toBeNull();
    const expiredRes = await runAssistant(studentUser, "Remove React", {
      confirmToken: expiredToken,
    });
    expect(expiredRes.status).toBe("rejected");
  });

  it("allows admin to block_user with confirmation token", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "u_target",
      email: "bad@example.com",
    });
    mockUpdateAdminUser.mockResolvedValue({
      id: "u_target",
      email: "bad@example.com",
      blocked: true,
    });
    mockGenerateJson.mockResolvedValue({
      action: "block_user",
      args: { email: "bad@example.com" },
      reply: "Confirm blocking bad@example.com.",
    });

    const pending = await runAssistant(adminUser, "Block bad@example.com");
    expect(pending.status).toBe("confirm_pending");
    const { confirmToken } = pending.data as { confirmToken: string };

    const confirmed = await runAssistant(adminUser, "Block bad@example.com", {
      confirmToken,
    });
    expect(confirmed.status).toBe("ok");
    expect(mockUpdateAdminUser).toHaveBeenCalledWith("u_admin", "u_target", {
      blocked: true,
    });
  });

  it("enforces per-user rate limits", async () => {
    mockLogCount.mockResolvedValueOnce(10).mockResolvedValueOnce(10);

    const res = await runAssistant(studentUser, "Show my skill gap");
    expect(res.status).toBe("rejected");
    expect(res.reply).toContain("Rate limit exceeded");
    expect(mockGenerateJson).not.toHaveBeenCalled();
  });
});
