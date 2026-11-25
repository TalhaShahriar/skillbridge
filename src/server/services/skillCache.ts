import { db } from "@/server/db";
import { buildMatcher, type SkillMatcher } from "@/server/services/skillMatcher";

const AMBIGUOUS_SKILL_NAMES = new Set([
  "C",
  "C#",
  "Go",
  "Rust",
  "Swift",
  "R",
  "Dart",
  "Bash",
  "Spring",
  ".NET",
  "Ionic",
  "Vault",
  "Looker",
  "Excel",
  "Spark",
  "Jest",
  "Git",
]);

let cachedMatcherPromise: Promise<SkillMatcher> | null = null;

export async function getSkillMatcher(): Promise<SkillMatcher> {
  if (!cachedMatcherPromise) {
    cachedMatcherPromise = db.skill
      .findMany({
        select: {
          id: true,
          name: true,
          aliases: {
            select: { alias: true },
          },
        },
      })
      .then((skills) =>
        buildMatcher(
          skills.map((s) => ({
            id: s.id,
            name: s.name,
            aliases: s.aliases.map((a) => a.alias),
            ambiguous: AMBIGUOUS_SKILL_NAMES.has(s.name),
          }))
        )
      )
      .catch((err) => {
        cachedMatcherPromise = null;
        throw err;
      });
  }

  return cachedMatcherPromise;
}

export function resetSkillMatcherCache(): void {
  cachedMatcherPromise = null;
}
