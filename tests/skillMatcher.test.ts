import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMatcher, type MatcherSkillInput } from "@/server/services/skillMatcher";

interface RawSkill {
  name: string;
  aliases: string[];
  ambiguous?: boolean;
}

const rawSkills: RawSkill[] = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "data/seed/skills.json"), "utf8")
);

const matcherSkills: MatcherSkillInput[] = rawSkills.map((s) => ({
  id: s.name,
  name: s.name,
  aliases: s.aliases,
  ambiguous: s.ambiguous,
}));

const matcher = buildMatcher(matcherSkills);

describe("skillMatcher.extract", () => {
  it("extracts C++ and C# accurately", () => {
    const found = matcher.extract("Experience with C++ and C#");
    expect(found).toContain("C++");
    expect(found).toContain("C#");
    expect(found).not.toContain("C");
  });

  it("extracts .NET Core without false positives", () => {
    expect(matcher.extract("Backend built with .NET Core and C#")).toEqual(
      expect.arrayContaining([".NET", "C#"])
    );
  });

  it("extracts slash-separated Node.js/Express", () => {
    expect(matcher.extract("Node.js/Express backend")).toEqual(
      expect.arrayContaining(["Node.js", "Express"])
    );
  });

  it("extracts CI/CD pipelines", () => {
    expect(matcher.extract("Experience building CI/CD pipelines")).toContain("CI/CD");
  });

  it("extracts hyphenated scikit-learn and alias sklearn", () => {
    expect(matcher.extract("Modeling with scikit-learn and Pandas")).toEqual(
      expect.arrayContaining(["scikit-learn", "Pandas"])
    );
    expect(matcher.extract("Used sklearn for classification")).toContain("scikit-learn");
  });

  it("extracts Next.js and Tailwind CSS", () => {
    expect(matcher.extract("Built UI using Next.js and Tailwind CSS")).toEqual(
      expect.arrayContaining(["Next.js", "Tailwind CSS"])
    );
  });

  it("prefers longest match: React Native does not also extract React", () => {
    const found = matcher.extract("React Native developer");
    expect(found).toContain("React Native");
    expect(found).not.toContain("React");
  });

  it("extracts both React and React Native when both appear separately", () => {
    const found = matcher.extract("Experience with React and React Native");
    expect(found).toContain("React");
    expect(found).toContain("React Native");
  });

  it("prefers Spring Boot over Spring when only Spring Boot is mentioned", () => {
    const found = matcher.extract("Java and Spring Boot microservices");
    expect(found).toContain("Java");
    expect(found).toContain("Spring Boot");
    expect(found).toContain("Microservices");
    expect(found).not.toContain("Spring");
  });

  it("extracts R in list context: R, Python, SQL", () => {
    const found = matcher.extract("Skills: R, Python, SQL");
    expect(found).toEqual(expect.arrayContaining(["R", "Python", "SQL"]));
  });

  it("extracts R in programming context", () => {
    expect(matcher.extract("Statistical analysis using R programming")).toContain("R");
    expect(matcher.extract("Experience in R and Tableau")).toEqual(
      expect.arrayContaining(["R", "Tableau"])
    );
  });

  it("does NOT match lowercase r or R&D as R", () => {
    expect(matcher.extract("Looking for r&d engineer")).not.toContain("R");
    expect(matcher.extract("A quick r review")).not.toContain("R");
  });

  it("extracts C in list/tech context: C, C++, Linux", () => {
    expect(matcher.extract("Proficient in C, C++, and Linux")).toEqual(
      expect.arrayContaining(["C", "C++", "Linux"])
    );
    expect(matcher.extract("Embedded C/C++ programming")).toEqual(
      expect.arrayContaining(["C", "C++"])
    );
  });

  it("does NOT produce false positives for Bachelor in CSE", () => {
    expect(matcher.extract("Bachelor in CSE")).toEqual([]);
  });

  it("does NOT match C-level or Grade C", () => {
    expect(matcher.extract("Reporting to C-level executives")).toEqual([]);
    expect(matcher.extract("Minimum Grade C required")).toEqual([]);
  });

  it("does NOT match 'go-to person' or 'go to' as Go", () => {
    expect(matcher.extract("You will be our go-to person for clients")).not.toContain("Go");
    expect(matcher.extract("Ready to go to production")).not.toContain("Go");
    expect(matcher.extract("Let us go forward with the plan")).not.toContain("Go");
  });

  it("extracts Go when used as programming language or Golang", () => {
    expect(matcher.extract("Backend services in Go, Docker, Kubernetes")).toEqual(
      expect.arrayContaining(["Go", "Docker", "Kubernetes"])
    );
    expect(matcher.extract("Experience with Golang and PostgreSQL")).toEqual(
      expect.arrayContaining(["Go", "PostgreSQL"])
    );
  });

  it("does NOT match 'excel at' or 'Spring 2026' as Excel or Spring", () => {
    expect(matcher.extract("You will excel at teamwork")).not.toContain("Excel");
    expect(matcher.extract("Spring 2026 internship cohort")).not.toContain("Spring");
  });

  it("extracts Excel and MS Excel in tool context", () => {
    expect(matcher.extract("Proficient in Excel, SQL, Power BI")).toEqual(
      expect.arrayContaining(["Excel", "SQL", "Power BI"])
    );
    expect(matcher.extract("Reporting in MS Excel")).toContain("Excel");
  });

  it("does NOT match file extensions like app.js or index.ts", () => {
    expect(matcher.extract("Edit app.js and index.ts")).toEqual([]);
  });

  it("handles trailing sentence punctuation cleanly", () => {
    expect(matcher.extract("We use React, PostgreSQL, and Docker.")).toEqual(
      expect.arrayContaining(["React", "PostgreSQL", "Docker"])
    );
  });

  it("deduplicates repeated skills in the same text", () => {
    const found = matcher.extract("Python, python3, and Python scripting");
    expect(found.filter((id) => id === "Python")).toHaveLength(1);
  });

  it("extracts cloud, database, and data skills from a realistic JD", () => {
    const jd =
      "Seeking a Data Engineer with AWS, Snowflake, dbt, Airflow, Apache Spark, and PostgreSQL.";
    expect(matcher.extract(jd)).toEqual(
      expect.arrayContaining(["AWS", "Snowflake", "dbt", "Airflow", "Spark", "PostgreSQL"])
    );
  });

  it("returns empty array for empty or whitespace text", () => {
    expect(matcher.extract("")).toEqual([]);
    expect(matcher.extract("   \n\t  ")).toEqual([]);
  });
});

describe("skillMatcher.normalize", () => {
  it("normalizes common aliases case-insensitively", () => {
    expect(matcher.normalize("js")).toBe("JavaScript");
    expect(matcher.normalize("  JavaScript ES6  ")).toBe("JavaScript");
    expect(matcher.normalize("reactjs")).toBe("React");
    expect(matcher.normalize("React.js")).toBe("React");
    expect(matcher.normalize("nodejs")).toBe("Node.js");
    expect(matcher.normalize("postgres")).toBe("PostgreSQL");
    expect(matcher.normalize("k8s")).toBe("Kubernetes");
    expect(matcher.normalize("golang")).toBe("Go");
    expect(matcher.normalize("sklearn")).toBe("scikit-learn");
    expect(matcher.normalize("MS   Excel")).toBe("Excel");
  });

  it("normalizes .js / js suffix variants sensibly", () => {
    expect(matcher.normalize("Svelte.js")).toBe("Svelte");
    expect(matcher.normalize("NextJS")).toBe("Next.js");
    expect(matcher.normalize("Vue.js")).toBe("Vue");
    expect(matcher.normalize("Express.js")).toBe("Express");
  });

  it("returns null for unknown or empty terms", () => {
    expect(matcher.normalize("")).toBeNull();
    expect(matcher.normalize("   ")).toBeNull();
    expect(matcher.normalize("Underwater Basket Weaving")).toBeNull();
    expect(matcher.normalize("ProprietaryInternalToolX")).toBeNull();
  });
});
