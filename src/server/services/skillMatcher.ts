export interface MatcherSkillInput {
  id: string;
  name: string;
  aliases: string[];
  ambiguous?: boolean;
}

export interface SkillMatcher {
  extract(text: string): string[];
  normalize(term: string): string | null;
}

interface CompiledPattern {
  skillId: string;
  skillName: string;
  term: string;
  regex: RegExp;
  strictAmbiguous: boolean;
}

interface CandidateMatch {
  skillId: string;
  start: number;
  end: number;
  length: number;
}

const SINGLE_LETTER_SKILLS = new Set(["r", "c"]);
const TECH_CONTEXT_RE =
  /\b(programming|language|languages|developer|engineer|engineering|experience|proficient|proficiency|skills?|stack|using|with|framework|library|database|analytics|statistical|backend|frontend|api|microservices|code|coding|script|scripting|devops|ml|ai|data)\b/i;
const GO_FALSE_POSITIVE_FOLLOW_RE =
  /^\s+(?:to|-to|for|into|beyond|ahead|live|fast|on|up|out|through|back|down|away|over|under|wrong|viral)\b/i;
const EXCEL_FALSE_POSITIVE_RE = /^\s+(?:at|in)\b/i;
const SPRING_FALSE_POSITIVE_RE =
  /^\s+(?:20\d{2}|19\d{2}|semester|break|term|intern(?:ship)?|cohort)\b/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespaceAndCase(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Builds a boundary-aware regex for a skill term/alias.
 * - Left boundary disallows alphanumerics, _, +, #, and . (so ".js" does not match "js",
 *   while ".NET" still matches after whitespace or punctuation because "." is in the pattern).
 * - Right boundary disallows alphanumerics, _, +, and #; allows "." only if it acts as
 *   sentence-ending punctuation (followed by end, whitespace, or delimiter).
 */
function buildTermRegex(term: string, caseSensitive: boolean): RegExp {
  const escaped = escapeRegex(term);
  const pattern = `(?:^|[^A-Za-z0-9_+#.])(${escaped})(?=$|[^A-Za-z0-9_+#.]|\\.(?=$|\\s|[,;:!?)]))`;
  return new RegExp(pattern, caseSensitive ? "g" : "gi");
}

/**
 * Ambiguous term validation rules:
 * 1. Single-letter skills ("R", "C"):
 *    - Must appear in exact uppercase ("R" or "C"), never lowercase.
 *    - Must NOT be part of "R&D" or "C-level" / "Grade C".
 *    - Must appear in a list-like context (comma/slash adjacent or "and <Token>")
 *      OR near tech context words (e.g. "programming", "language", "experience").
 * 2. "Go":
 *    - Must be capitalized ("Go") when matched via the short name (alias "golang" is unambiguous).
 *    - Must NOT be followed by verb/idiom words ("go to", "go-to", "go for", etc.).
 *    - Must appear in list-like context or near tech context words.
 * 3. Other ambiguous English-word skills ("Swift", "Spring", "Rust", "Dart", "Excel", etc.):
 *    - Reject known non-tech phrases ("excel at/in", "spring 2026", "spring semester/break").
 *    - Require either capitalized first letter in text OR list/tech context.
 */
function passesAmbiguousCheck(
  text: string,
  matchedText: string,
  start: number,
  end: number,
  skillNameLower: string
): boolean {
  const before = text.slice(Math.max(0, start - 35), start);
  const after = text.slice(end, Math.min(text.length, end + 35));
  const immediateBefore = text.slice(Math.max(0, start - 3), start);
  const immediateAfter = text.slice(end, Math.min(text.length, end + 4));

  const inListContext =
    /[,/]\s*$/.test(immediateBefore) ||
    /^\s*[,/]/.test(immediateAfter) ||
    /\b(?:and|or|&)\s+$/.test(before) ||
    /^\s+(?:and|or)\b/.test(after);

  const hasTechContext =
    TECH_CONTEXT_RE.test(before) || TECH_CONTEXT_RE.test(after);

  if (SINGLE_LETTER_SKILLS.has(skillNameLower)) {
    if (matchedText !== skillNameLower.toUpperCase()) {
      return false;
    }
    if (skillNameLower === "r" && /^\s*&\s*D\b/i.test(after)) {
      return false;
    }
    if (
      skillNameLower === "c" &&
      (/^\s*-\s*level\b/i.test(after) || /\bgrade\s+$/i.test(before))
    ) {
      return false;
    }
    return inListContext || hasTechContext;
  }

  if (skillNameLower === "go") {
    if (matchedText !== "Go") {
      return false;
    }
    if (GO_FALSE_POSITIVE_FOLLOW_RE.test(after)) {
      return false;
    }
    if (/^\s*-\s*to\b/i.test(after)) {
      return false;
    }
    return inListContext || hasTechContext;
  }

  if (skillNameLower === "excel" && EXCEL_FALSE_POSITIVE_RE.test(after)) {
    return false;
  }
  if (skillNameLower === "spring" && SPRING_FALSE_POSITIVE_RE.test(after)) {
    return false;
  }

  const startsCapitalized = /^[A-Z]/.test(matchedText);
  return startsCapitalized || inListContext || hasTechContext;
}

export function buildMatcher(skills: MatcherSkillInput[]): SkillMatcher {
  const aliasToSkillId = new Map<string, string>();
  const compiledPatterns: CompiledPattern[] = [];

  for (const skill of skills) {
    const normalizedName = normalizeWhitespaceAndCase(skill.name);
    aliasToSkillId.set(normalizedName, skill.id);

    const terms = new Set<string>([normalizedName]);
    for (const alias of skill.aliases) {
      const normalizedAlias = normalizeWhitespaceAndCase(alias);
      if (normalizedAlias) {
        aliasToSkillId.set(normalizedAlias, skill.id);
        terms.add(normalizedAlias);
      }
    }

    for (const term of terms) {
      // Only apply strict ambiguous filtering to the short/ambiguous name itself
      // (not multi-word or distinct aliases like "golang", "ms excel", "r programming").
      // Symbols like C# and .NET are unambiguous in prose.
      const isSymbolSkill = /[+#.]/.test(term);
      const strictAmbiguous =
        Boolean(skill.ambiguous) && term === normalizedName && !isSymbolSkill;

      compiledPatterns.push({
        skillId: skill.id,
        skillName: normalizedName,
        term,
        regex: buildTermRegex(term, false),
        strictAmbiguous,
      });
    }
  }

  function extract(text: string): string[] {
    if (!text.trim()) {
      return [];
    }

    const candidates: CandidateMatch[] = [];

    for (const pattern of compiledPatterns) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(text)) !== null) {
        const captured = match[1];
        if (!captured) continue;

        const fullIndex = match.index;
        const captureOffset = match[0].indexOf(captured);
        const start = fullIndex + captureOffset;
        const end = start + captured.length;

        if (
          pattern.strictAmbiguous &&
          !passesAmbiguousCheck(text, captured, start, end, pattern.skillName)
        ) {
          continue;
        }

        candidates.push({
          skillId: pattern.skillId,
          start,
          end,
          length: captured.length,
        });
      }
    }

    // Prefer longest match so e.g. "React Native" claims [0..12) before "React" [0..5).
    candidates.sort((a, b) => b.length - a.length || a.start - b.start);

    const accepted: CandidateMatch[] = [];
    const resultIds: string[] = [];
    const seenIds = new Set<string>();

    for (const candidate of candidates) {
      const overlaps = accepted.some(
        (existing) =>
          candidate.start < existing.end && candidate.end > existing.start
      );
      if (overlaps) {
        continue;
      }
      accepted.push(candidate);
      if (!seenIds.has(candidate.skillId)) {
        seenIds.add(candidate.skillId);
        resultIds.push(candidate.skillId);
      }
    }

    return resultIds;
  }

  function normalize(term: string): string | null {
    const cleaned = normalizeWhitespaceAndCase(term);
    if (!cleaned) {
      return null;
    }

    const direct = aliasToSkillId.get(cleaned);
    if (direct) {
      return direct;
    }

    // Handle ".js" / "js" variants (e.g., "React.js" -> "react", "Nextjs" -> "next.js")
    if (cleaned.length > 3 && (cleaned.endsWith(".js") || cleaned.endsWith("js"))) {
      const base = cleaned.replace(/\.?js$/, "").trim();
      if (base) {
        const fromBase = aliasToSkillId.get(base);
        if (fromBase) return fromBase;

        const fromDotJs = aliasToSkillId.get(`${base}.js`);
        if (fromDotJs) return fromDotJs;
      }
    }

    return null;
  }

  return { extract, normalize };
}
