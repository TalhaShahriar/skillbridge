import type { User } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import {
  assertAdmin,
  assertUser,
  isAuthError,
} from "@/server/lib/auth-checks";

export {
  AuthError,
  ForbiddenError,
  UnauthorizedError,
  getNavLinksForRole,
  isAuthError,
} from "@/server/lib/auth-checks";

type AuthResolution =
  | { status: "unauthenticated"; user: null }
  | { status: "blocked"; user: User }
  | { status: "authenticated"; user: User };

async function resolveCurrentUser(): Promise<AuthResolution> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { status: "unauthenticated", user: null };
  }

  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !supabaseUser || !supabaseUser.email) {
    return { status: "unauthenticated", user: null };
  }

  const email = supabaseUser.email;
  const metadata = supabaseUser.user_metadata ?? {};
  const name =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : null;

  const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase();
  const isFirstAdminCandidate =
    Boolean(firstAdminEmail) && email.toLowerCase() === firstAdminEmail;

  let shouldPromoteToAdmin = false;
  if (isFirstAdminCandidate) {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    shouldPromoteToAdmin = adminCount === 0;
  }

  const localUser = await db.user.upsert({
    where: { authId: supabaseUser.id },
    create: {
      authId: supabaseUser.id,
      email,
      name,
      avatarUrl,
      role: shouldPromoteToAdmin ? "ADMIN" : "STUDENT",
    },
    update: {
      email,
      name,
      avatarUrl,
      ...(shouldPromoteToAdmin ? { role: "ADMIN" } : {}),
    },
  });

  if (localUser.blocked) {
    return { status: "blocked", user: localUser };
  }

  return { status: "authenticated", user: localUser };
}

/**
 * Reads the Supabase user server-side via getUser(), upserts the local User,
 * and returns null if not signed in or if the user is blocked.
 */
export async function getCurrentUser(): Promise<User | null> {
  const resolved = await resolveCurrentUser();
  if (resolved.status !== "authenticated") {
    return null;
  }
  return resolved.user;
}

/**
 * Requires a signed-in, non-blocked user for API route handlers.
 * Throws UnauthorizedError (401) or ForbiddenError (403).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  return assertUser(user);
}

/**
 * Requires a signed-in, non-blocked ADMIN user for API route handlers.
 * Throws UnauthorizedError (401) or ForbiddenError (403).
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  return assertAdmin(user);
}

/**
 * Converts AuthError (UnauthorizedError / ForbiddenError) into a 401/403 JSON response.
 * Returns null for non-auth errors so callers can rethrow or handle them.
 */
export function handleAuthError(error: unknown): NextResponse | null {
  if (!isAuthError(error)) {
    return null;
  }
  return NextResponse.json(
    { error: error.message },
    { status: error.status }
  );
}

/**
 * Page guard for student/authenticated routes.
 * Redirects to /login if signed out or /blocked if blocked.
 */
export async function requirePageUser(): Promise<User> {
  const resolved = await resolveCurrentUser();
  if (resolved.status === "unauthenticated") {
    redirect("/login");
  }
  if (resolved.status === "blocked") {
    redirect("/blocked");
  }
  return resolved.user;
}

/**
 * Page guard for admin-only routes.
 * Redirects to /login if signed out, /blocked if blocked, or /forbidden if not ADMIN.
 */
export async function requirePageAdmin(): Promise<User> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") {
    redirect("/forbidden");
  }
  return user;
}
