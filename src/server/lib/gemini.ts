import { GoogleGenAI, type SchemaUnion } from "@google/genai";
import type { z } from "zod";

export class GeminiUnavailableError extends Error {
  constructor(message = "Gemini service is temporarily unavailable") {
    super(message);
    this.name = "GeminiUnavailableError";
  }
}

export class GeminiOutputError extends Error {
  constructor(message = "Gemini returned invalid JSON output") {
    super(message);
    this.name = "GeminiOutputError";
  }
}

const TIMEOUT_MS = 10_000;
const RETRY_BACKOFF_MS = 400;

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateJson<T>(
  systemPrompt: string,
  userText: string,
  zodSchema: z.ZodType<T>,
  responseSchema?: SchemaUnion
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    throw new GeminiUnavailableError("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: userText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          ...(responseSchema ? { responseSchema } : {}),
          abortSignal: controller.signal,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new GeminiOutputError("Empty response from Gemini");
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        throw new GeminiOutputError("Response was not valid JSON");
      }

      const validated = zodSchema.safeParse(parsedJson);
      if (!validated.success) {
        throw new GeminiOutputError("Response JSON failed schema validation");
      }

      return validated.data;
    } catch (err) {
      if (err instanceof GeminiOutputError) {
        throw err;
      }
      lastError = err;
      if (attempt === 0 && isRetryableError(err)) {
        await sleep(RETRY_BACKOFF_MS);
        continue;
      }
      throw new GeminiUnavailableError("Gemini request failed");
    } finally {
      clearTimeout(timer);
    }
  }

  throw new GeminiUnavailableError(
    lastError instanceof Error ? lastError.message : "Gemini unavailable"
  );
}
