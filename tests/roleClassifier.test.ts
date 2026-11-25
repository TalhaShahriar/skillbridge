import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyRole,
  type RoleClassifierInput,
} from "@/server/services/roleClassifier";

interface RawRole {
  slug: string;
  titleKeywords: string[];
}

const rawRoles: RawRole[] = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "data/seed/roles.json"), "utf8")
);

const roles: RoleClassifierInput[] = rawRoles.map((r) => ({
  id: r.slug,
  slug: r.slug,
  titleKeywords: r.titleKeywords,
}));

describe("roleClassifier.classifyRole", () => {
  it("classifies Full Stack before Frontend/Backend", () => {
    expect(classifyRole("Full Stack Developer", roles)).toBe("full-stack-developer");
    expect(classifyRole("Senior Full-stack React & Node Engineer", roles)).toBe(
      "full-stack-developer"
    );
    expect(classifyRole("Software Engineer", roles)).toBe("full-stack-developer");
  });

  it("classifies Machine Learning Engineer as ML Engineer, not Data Scientist", () => {
    expect(classifyRole("Machine Learning Engineer", roles)).toBe("ml-engineer");
    expect(classifyRole("Junior ML Engineer (PyTorch)", roles)).toBe("ml-engineer");
    expect(classifyRole("AI Engineer - LLMs", roles)).toBe("ml-engineer");
  });

  it("classifies Data Scientist and Data Analyst accurately", () => {
    expect(classifyRole("Data Scientist", roles)).toBe("data-scientist");
    expect(classifyRole("Junior Data Analyst", roles)).toBe("data-analyst");
    expect(classifyRole("Business Analyst - SQL & Power BI", roles)).toBe(
      "data-analyst"
    );
  });

  it("classifies Frontend and Backend roles", () => {
    expect(classifyRole("Frontend Developer (React/Next.js)", roles)).toBe(
      "frontend-developer"
    );
    expect(classifyRole("Front-End UI Developer", roles)).toBe(
      "frontend-developer"
    );
    expect(classifyRole("Backend Developer (Node.js)", roles)).toBe(
      "backend-developer"
    );
    expect(classifyRole("Python Developer - FastAPI", roles)).toBe(
      "backend-developer"
    );
  });

  it("classifies Mobile, DevOps, and QA roles", () => {
    expect(classifyRole("Flutter Mobile Developer", roles)).toBe(
      "mobile-developer"
    );
    expect(classifyRole("iOS Engineer", roles)).toBe("mobile-developer");
    expect(classifyRole("DevOps Engineer (AWS/Kubernetes)", roles)).toBe(
      "devops-engineer"
    );
    expect(classifyRole("Site Reliability Engineer (SRE)", roles)).toBe(
      "devops-engineer"
    );
    expect(classifyRole("QA Automation Engineer", roles)).toBe("qa-engineer");
    expect(classifyRole("SDET - Playwright", roles)).toBe("qa-engineer");
  });

  it("falls back to Other for unmatched or empty titles", () => {
    expect(classifyRole("IT Support Specialist", roles)).toBe("other");
    expect(classifyRole("Technical Writer", roles)).toBe("other");
    expect(classifyRole("", roles)).toBe("other");
  });
});
