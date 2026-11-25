import { describe, expect, it } from "vitest";
import {
  AdminServiceError,
  validateUserAdminMutation,
} from "@/server/services/admin";

describe("admin user mutation guards", () => {
  it("prevents admin from blocking themselves", () => {
    expect(() =>
      validateUserAdminMutation({
        actorUserId: "u1",
        targetUserId: "u1",
        targetCurrentRole: "ADMIN",
        adminCount: 2,
        blocked: true,
      })
    ).toThrow(AdminServiceError);
  });

  it("prevents admin from demoting themselves", () => {
    expect(() =>
      validateUserAdminMutation({
        actorUserId: "u1",
        targetUserId: "u1",
        targetCurrentRole: "ADMIN",
        adminCount: 2,
        role: "STUDENT",
      })
    ).toThrow(AdminServiceError);
  });

  it("prevents demoting the last remaining admin", () => {
    expect(() =>
      validateUserAdminMutation({
        actorUserId: "u1",
        targetUserId: "u2",
        targetCurrentRole: "ADMIN",
        adminCount: 1,
        role: "STUDENT",
      })
    ).toThrow(AdminServiceError);
  });

  it("allows blocking another user or demoting an admin when >= 2 admins exist", () => {
    expect(() =>
      validateUserAdminMutation({
        actorUserId: "u1",
        targetUserId: "u2",
        targetCurrentRole: "STUDENT",
        adminCount: 1,
        blocked: true,
      })
    ).not.toThrow();

    expect(() =>
      validateUserAdminMutation({
        actorUserId: "u1",
        targetUserId: "u2",
        targetCurrentRole: "ADMIN",
        adminCount: 2,
        role: "STUDENT",
      })
    ).not.toThrow();
  });
});
