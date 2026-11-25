import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleAuthError } from "@/server/auth";
import { AdminServiceError } from "@/server/services/admin";
import { ProfileServiceError } from "@/server/services/profile";

export function apiErrorResponse(error: unknown): NextResponse {
  const authRes = handleAuthError(error);
  if (authRes) return authRes;

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 }
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (error instanceof ProfileServiceError || error instanceof AdminServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
