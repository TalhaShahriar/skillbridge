import { describe, expect, it } from "vitest";
import {
  detectCvFileType,
  MAX_CV_TEXT_CHARS,
  normalizeExtractedSkills,
  redactPII,
} from "@/server/services/cv";

describe("redactPII", () => {
  it("strips standard email addresses", () => {
    expect(redactPII("Contact: john.doe+cv@gmail.com")).toBe(
      "Contact: [email]"
    );
  });

  it("strips university and corporate emails", () => {
    expect(redactPII("Email me at student2026@cse.buet.ac.bd")).toBe(
      "Email me at [email]"
    );
  });

  it("strips Bangladeshi +880 phone numbers", () => {
    expect(redactPII("Phone: +880 1712-345678")).toBe("Phone: [phone]");
    expect(redactPII("Mobile: +8801812345678")).toBe("Mobile: [phone]");
  });

  it("strips local Bangladeshi 01X phone numbers", () => {
    expect(redactPII("Call 01712345678 or 01911-223344")).toBe(
      "Call [phone] or [phone]"
    );
  });

  it("strips international phone numbers", () => {
    expect(redactPII("Tel: +1 (415) 555-0199")).toBe("Tel: [phone]");
  });

  it("preserves education year ranges like 2020 - 2024", () => {
    expect(redactPII("BSc in CSE, 2020 - 2024")).toBe(
      "BSc in CSE, 2020 - 2024"
    );
  });

  it("strips LinkedIn and GitHub personal URLs", () => {
    expect(
      redactPII("Links: https://linkedin.com/in/johndoe and github.com/johndoe")
    ).toBe("Links: [url] and [url]");
  });

  it("strips generic http/https URLs", () => {
    expect(redactPII("Portfolio: https://myportfolio.dev/about")).toBe(
      "Portfolio: [url]"
    );
  });

  it("strips address-labeled lines", () => {
    expect(redactPII("Address: 123 Main St\nSkills: React, TypeScript")).toBe(
      "[address]\nSkills: React, TypeScript"
    );
  });

  it("strips Bangladeshi postal address lines", () => {
    expect(
      redactPII("House #12, Road #5, Dhanmondi, Dhaka-1209\nPython, SQL")
    ).toBe("[address]\nPython, SQL");
  });

  it("trims output to MAX_CV_TEXT_CHARS (12000)", () => {
    const longText = "a".repeat(15_000);
    expect(redactPII(longText).length).toBe(MAX_CV_TEXT_CHARS);
  });
});

describe("normalizeExtractedSkills", () => {
  const skillMeta = new Map([
    ["sk_react", { id: "sk_react", name: "React", category: "Frontend" }],
    ["sk_pg", { id: "sk_pg", name: "PostgreSQL", category: "Database" }],
  ]);

  const normalize = (term: string) => {
    const t = term.trim().toLowerCase();
    if (t === "reactjs" || t === "react") return "sk_react";
    if (t === "postgres" || t === "postgresql") return "sk_pg";
    return null;
  };

  it("normalizes recognized skills, deduplicates, and collects unrecognized", () => {
    const res = normalizeExtractedSkills(
      [
        { name: "reactjs", level: "INTERMEDIATE" },
        { name: "React", level: "ADVANCED" },
        { name: "postgres", level: null },
        { name: "ProprietaryTool", level: null },
      ],
      normalize,
      skillMeta
    );

    expect(res.recognized).toEqual([
      {
        skillId: "sk_react",
        name: "React",
        category: "Frontend",
        level: "INTERMEDIATE",
      },
      {
        skillId: "sk_pg",
        name: "PostgreSQL",
        category: "Database",
        level: "BEGINNER",
      },
    ]);
    expect(res.unrecognized).toEqual(["ProprietaryTool"]);
  });
});

describe("detectCvFileType", () => {
  it("detects PDF and DOCX via magic bytes", () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(detectCvFileType(pdfBytes, "application/pdf", "cv.pdf")).toBe("pdf");

    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]);
    expect(
      detectCvFileType(
        zipBytes,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "cv.docx"
      )
    ).toBe("docx");

    const badBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(detectCvFileType(badBytes, "application/pdf", "fake.pdf")).toBeNull();
  });
});
