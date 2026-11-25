import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import { runAssistant } from "@/server/services/assistant/run";

const AssistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  confirmToken: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = AssistantRequestSchema.parse(body);
    const result = await runAssistant(
      { id: user.id, email: user.email, role: user.role },
      parsed.message,
      { confirmToken: parsed.confirmToken }
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
