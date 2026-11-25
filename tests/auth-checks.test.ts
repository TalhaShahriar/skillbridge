import { describe, expect, it } from "vitest";
import {
  assertAdmin,
  assertUser,
  ForbiddenError,
  getNavLinksForRole,
  isAuthError,
  UnauthorizedError,
  type AuthUserLike,
} from "@/server/lib/auth-checks";

const studentUser: AuthUserLike = {
  id: "user_1",
  email: "student@example.com",
  role: "STUDENT",
  blocked: false,
};

const adminUser: AuthUserLike = {
  id: "user_2",
  email: "admin@example.com",
  role: "ADMIN",
  blocked: false,
};

const blockedStudent: AuthUserLike = {
  id: "user_3",
  email: "blocked@example.com",
  role: "STUDENT",
  blocked: true,
};

describe("auth role-check helpers", () => {
  it("assertUser throws UnauthorizedError for null", () => {
    expect(() => assertUser(null)).toThrow(UnauthorizedError);
  });

  it("assertUser throws ForbiddenError for blocked user", () => {
    expect(() => assertUser(blockedStudent)).toThrow(ForbiddenError);
  });

  it("assertUser returns active student or admin", () => {
    expect(assertUser(studentUser)).toEqual(studentUser);
    expect(assertUser(adminUser)).toEqual(adminUser);
  });

  it("assertAdmin throws UnauthorizedError for null", () => {
    expect(() => assertAdmin(null)).toThrow(UnauthorizedError);
  });

  it("assertAdmin throws ForbiddenError for student or blocked user", () => {
    expect(() => assertAdmin(studentUser)).toThrow(ForbiddenError);
    expect(() => assertAdmin(blockedStudent)).toThrow(ForbiddenError);
  });

  it("assertAdmin returns active admin", () => {
    expect(assertAdmin(adminUser)).toEqual(adminUser);
  });

  it("isAuthError identifies AuthError subclasses with HTTP status", () => {
    const unauth = new UnauthorizedError();
    const forbidden = new ForbiddenError();
    expect(isAuthError(unauth)).toBe(true);
    expect(unauth.status).toBe(401);
    expect(isAuthError(forbidden)).toBe(true);
    expect(forbidden.status).toBe(403);
    expect(isAuthError(new Error("other"))).toBe(false);
  });

  it("getNavLinksForRole filters links by role", () => {
    const guestHrefs = getNavLinksForRole(null).map((l) => l.href);
    expect(guestHrefs).toEqual(["/dashboard", "/jobs"]);

    const studentHrefs = getNavLinksForRole("STUDENT").map((l) => l.href);
    expect(studentHrefs).toEqual([
      "/dashboard",
      "/jobs",
      "/profile",
      "/skill-gap",
      "/recommendations",
      "/assistant",
    ]);

    const adminHrefs = getNavLinksForRole("ADMIN").map((l) => l.href);
    expect(adminHrefs).toEqual([
      "/dashboard",
      "/jobs",
      "/profile",
      "/skill-gap",
      "/recommendations",
      "/assistant",
      "/admin",
    ]);
  });
});
