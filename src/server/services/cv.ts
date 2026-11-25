import { Type, type SchemaUnion } from "@google/genai";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { z } from "zod";
import { db } from "@/server/db";
import {
  GeminiOutputError,
  GeminiUnavailableError,
  generateJson,
} from "@/server/lib/gemini";
import type { EducationItem, SkillLevelInput } from "@/server/schemas";
import { getSkillMatcher } from "@/server/services/skillCache";

export const MAX_CV_BYTES = 2 * 1024 * 1024; // 2 MB
export const MIN_CV_TEXT_CHARS = 200;
export const MAX_CV_TEXT_CHARS = 12_000;

export const CvGeminiExtractionSchema = z.object({
  education: z
    .array(
      z.object({
        degree: z.string().trim().min(1).max(120),
        institution: z.string().trim().min(1).max(160),
        year: z.string().trim().max(20).nullable().optional(),
      })
    )
    .default([]),
  experienceLevel: z
    .enum(["INTERN", "ENTRY", "MID", "SENIOR"])
    .nullable()
    .default(null),
  interests: z.array(z.string().trim().min(1).max(60)).default([]),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        level: z
          .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
          .nullable()
          .optional(),
      })
    )
    .default([]),
});

export type CvGeminiExtraction = z.infer<typeof CvGeminiExtractionSchema>;

export interface CvRecognizedSkill {
  skillId: string;
  name: string;
  category: string;
  level: SkillLevelInput;
}

export interface CvProposal {
  fallback: boolean;
  education: EducationItem[];
  experienceLevel: "INTERN" | "ENTRY" | "MID" | "SENIOR" | null;
  interests: string[];
  recognized: CvRecognizedSkill[];
  unrecognized: string[];
}

const CV_GEMINI_RESPONSE_SCHEMA: SchemaUnion = {
  type: Type.OBJECT,
  properties: {
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          institution: { type: Type.STRING },
          year: { type: Type.STRING, nullable: true },
        },
        required: ["degree", "institution"],
      },
    },
    experienceLevel: {
      type: Type.STRING,
      nullable: true,
    },
    interests: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    skills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          level: { type: Type.STRING, nullable: true },
        },
        required: ["name"],
      },
    },
  },
  required: ["education", "experienceLevel", "interests", "skills"],
};

const CV_SYSTEM_PROMPT = `You are a strict CV parser for SkillBridge.
Extract ONLY information explicitly stated in the CV text.
Output JSON matching { education, experienceLevel, interests, skills }.
Rules:
- education: [{ degree, institution, year }] (empty array if none).
- experienceLevel: "INTERN" | "ENTRY" | "MID" | "SENIOR" | null (null if unclear; do not guess).
- interests: short topic/domain strings explicitly listed as interests/focus areas (empty array if none).
- skills: [{ name, level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null }] (use null for level if not stated).
- Never invent or infer unstated facts.`;

/**
 * Checks both magic bytes and MIME/filename to allow only PDF or DOCX.
 */
export function detectCvFileType(
  bytes: Uint8Array,
  mimeType: string,
  fileName = ""
): "pdf" | "docx" | null {
  const isPdfMagic =
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d; // %PDF-

  const isZipMagic =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04; // PK.. (DOCX is OOXML zip)

  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (
    isPdfMagic &&
    (lowerMime === "application/pdf" ||
      lowerMime === "" ||
      lowerName.endsWith(".pdf"))
  ) {
    return "pdf";
  }

  if (
    isZipMagic &&
    (lowerMime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx"))
  ) {
    return "docx";
  }

  return null;
}

/**
 * Strips emails, phone numbers (including Bangladeshi +880/01X), personal URLs,
 * and address-like lines before sending CV text to Gemini, and trims to ~12k chars.
 */
export function redactPII(text: string): string {
  const ADDRESS_LINE_RE =
    /^(?:address|present address|permanent address|mailing address|location|residence)\s*:/i;
  const ADDRESS_TOKENS_RE =
    /\b(?:house\s*#?\s*\d+|road\s*#?\s*\d+|sector\s*#?\s*\d+|block\s*[a-z0-9-]+|apt\.?\s*\d+|suite\s*\d+|street|ave(?:nue)?|blvd|postal\s*code|zip\s*code|dhanmondi|gulshan|banani|mirpur|uttara|mohammadpur|dhaka[-\s]*1\d{3})\b/i;

  const lines = text.split(/\r?\n/).map((line) => {
    if (ADDRESS_LINE_RE.test(line.trim()) || ADDRESS_TOKENS_RE.test(line)) {
      return "[address]";
    }
    return line;
  });

  let redacted = lines.join("\n");

  // Emails
  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[email]"
  );

  // Personal profile URLs & handles
  redacted = redacted.replace(
    /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in|github\.com|gitlab\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|behance\.net|dribbble\.com|medium\.com\/@)\/[^\s,;)]+/gi,
    "[url]"
  );
  redacted = redacted.replace(/https?:\/\/[^\s,;)]+/gi, "[url]");

  // Bangladeshi phone numbers (+8801X..., 8801X..., 01X... with 8 subscriber digits)
  redacted = redacted.replace(
    /(?:\+?880[-\s]?|0)1[3-9](?:[-\s]?\d){8}\b/g,
    "[phone]"
  );

  // Generic international phone numbers (at least 8 digits, avoids matching 2020-2024)
  redacted = redacted.replace(
    /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{1,4})?/g,
    (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 8 ? "[phone]" : match;
    }
  );

  return redacted.trim().slice(0, MAX_CV_TEXT_CHARS);
}

export function normalizeExtractedSkills(
  extracted: { name: string; level?: SkillLevelInput | null }[],
  normalizeTerm: (term: string) => string | null,
  skillMetaById: Map<string, { id: string; name: string; category: string }>
): { recognized: CvRecognizedSkill[]; unrecognized: string[] } {
  const recognizedMap = new Map<string, CvRecognizedSkill>();
  const unrecognized: string[] = [];
  const seenUnrecognized = new Set<string>();

  for (const item of extracted) {
    const skillId = normalizeTerm(item.name);
    const meta = skillId ? skillMetaById.get(skillId) : undefined;
    if (!skillId || !meta) {
      const key = item.name.trim().toLowerCase();
      if (key && !seenUnrecognized.has(key)) {
        seenUnrecognized.add(key);
        unrecognized.push(item.name.trim());
      }
      continue;
    }

    if (!recognizedMap.has(skillId)) {
      recognizedMap.set(skillId, {
        skillId: meta.id,
        name: meta.name,
        category: meta.category,
        level: item.level ?? "BEGINNER",
      });
    }
  }

  return {
    recognized: Array.from(recognizedMap.values()),
    unrecognized,
  };
}

export async function extractCvText(
  bytes: Uint8Array,
  fileType: "pdf" | "docx"
): Promise<string> {
  if (fileType === "pdf") {
    const { text } = await extractText(bytes, { mergePages: true });
    return text;
  }

  const buffer = Buffer.from(bytes);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseCvWithGemini(
  redactedText: string
): Promise<CvGeminiExtraction> {
  return generateJson(
    CV_SYSTEM_PROMPT,
    redactedText,
    CvGeminiExtractionSchema,
    CV_GEMINI_RESPONSE_SCHEMA
  );
}

export async function buildCvProposal(rawText: string): Promise<CvProposal> {
  const redacted = redactPII(rawText);
  const [matcher, allSkills] = await Promise.all([
    getSkillMatcher(),
    db.skill.findMany({
      select: { id: true, name: true, category: true },
    }),
  ]);
  const skillMetaById = new Map(allSkills.map((s) => [s.id, s]));

  try {
    const extracted = await parseCvWithGemini(redacted);
    const { recognized, unrecognized } = normalizeExtractedSkills(
      extracted.skills,
      matcher.normalize,
      skillMetaById
    );

    return {
      fallback: false,
      education: extracted.education.map((e) => ({
        degree: e.degree,
        institution: e.institution,
        year: e.year ?? "",
      })),
      experienceLevel: extracted.experienceLevel,
      interests: extracted.interests,
      recognized,
      unrecognized,
    };
  } catch (err) {
    if (
      !(err instanceof GeminiUnavailableError) &&
      !(err instanceof GeminiOutputError)
    ) {
      throw err;
    }

    const matchedIds = matcher.extract(redacted);
    const recognized: CvRecognizedSkill[] = matchedIds
      .map((id) => skillMetaById.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({
        skillId: m.id,
        name: m.name,
        category: m.category,
        level: "BEGINNER",
      }));

    return {
      fallback: true,
      education: [],
      experienceLevel: null,
      interests: [],
      recognized,
      unrecognized: [],
    };
  }
}
