import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockUserCount, mockUserUpsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserCount: vi.fn(),
  mockUserUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      count: mockUserCount,
      upsert: mockUserUpsert,
    },
  },
}));

import {
  getCurrentUser,
  handleAuthError,
  requireAdmin,
  requireUser,
} from "@/server/auth";

describe("API access control (signed-out, blocked, student, admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    mockUserCount.mockResolvedValue(1);
  });

  it("signed-out user gets null from getCurrentUser and 401 from requireUser", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await getCurrentUser()).toBeNull();
    try {
      await requireUser();
      expect.unreachable("Should have thrown");
    } catch (err) {
      const res = handleAuthError(err);
      expect(res?.status).toBe(401);
    }
  });

  it("blocked user is treated as signed out and cannot call student or admin APIs", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth_1", email: "blocked@example.com", user_metadata: {} } },
      error: null,
    });
    mockUserUpsert.mockResolvedValue({
      id: "u_blocked",
      authId: "auth_1",
      email: "blocked@example.com",
      role: "STUDENT",
      blocked: true,
    });

    expect(await getCurrentUser()).toBeNull();
    try {
      await requireUser();
      expect.unreachable("Should have thrown");
    } catch (err) {
      const res = handleAuthError(err);
      expect(res?.status).toBe(401);
    }
  });

  it("student gets 403 when calling requireAdmin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth_2", email: "student@example.com", user_metadata: {} } },
      error: null,
    });
    mockUserUpsert.mockResolvedValue({
      id: "u_student",
      authId: "auth_2",
      email: "student@example.com",
      role: "STUDENT",
      blocked: false,
    });

    const user = await requireUser();
    expect(user.role).toBe("STUDENT");

    try {
      await requireAdmin();
      expect.unreachable("Should have thrown");
    } catch (err) {
      const res = handleAuthError(err);
      expect(res?.status).toBe(403);
    }
  });

  it("active admin passes requireAdmin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth_3", email: "admin@example.com", user_metadata: {} } },
      error: null,
    });
    mockUserUpsert.mockResolvedValue({
      id: "u_admin",
      authId: "auth_3",
      email: "admin@example.com",
      role: "ADMIN",
      blocked: false,
    });

    const admin = await requireAdmin();
    expect(admin.role).toBe("ADMIN");
  });
});
