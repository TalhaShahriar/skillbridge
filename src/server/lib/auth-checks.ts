import type { Role } from "@prisma/client";

export interface AuthUserLike {
  id: string;
  email: string;
  role: Role;
  blocked: boolean;
}

export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Ensures a user is present and not blocked.
 * Throws UnauthorizedError (401) if null, or ForbiddenError (403) if blocked.
 */
export function assertUser<T extends AuthUserLike>(user: T | null): T {
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.blocked) {
    throw new ForbiddenError("Account is blocked");
  }
  return user;
}

/**
 * Ensures the user is authenticated, not blocked, and has the ADMIN role.
 */
export function assertAdmin<T extends AuthUserLike>(user: T | null): T {
  const validUser = assertUser(user);
  if (validUser.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return validUser;
}

export interface NavLink {
  href: string;
  label: string;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
];

const STUDENT_LINKS: NavLink[] = [
  { href: "/profile", label: "Profile" },
  { href: "/skill-gap", label: "Skill Gap" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/assistant", label: "Assistant" },
];

const ADMIN_LINKS: NavLink[] = [{ href: "/admin", label: "Admin" }];

export function getNavLinksForRole(role: Role | null | undefined): NavLink[] {
  if (!role) {
    return PUBLIC_LINKS;
  }
  if (role === "ADMIN") {
    return [...PUBLIC_LINKS, ...STUDENT_LINKS, ...ADMIN_LINKS];
  }
  return [...PUBLIC_LINKS, ...STUDENT_LINKS];
}
