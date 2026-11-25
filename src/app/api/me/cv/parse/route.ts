import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/lib/api-error";
import {
  buildCvProposal,
  detectCvFileType,
  extractCvText,
  MAX_CV_BYTES,
  MIN_CV_TEXT_CHARS,
} from "@/server/services/cv";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a PDF or DOCX file." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_CV_BYTES) {
      return NextResponse.json(
        { error: "CV file must be under 2 MB." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileType = detectCvFileType(bytes, file.type, file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: "Only valid PDF or DOCX files are supported." },
        { status: 400 }
      );
    }

    const text = await extractCvText(bytes, fileType);
    if (text.trim().length < MIN_CV_TEXT_CHARS) {
      return NextResponse.json({
        status: "scanned_or_empty",
        message:
          "Could not extract enough text from this file (it may be a scanned PDF). Please enter your details manually.",
      });
    }

    const proposal = await buildCvProposal(text);
    return NextResponse.json({ status: "ok", proposal });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
