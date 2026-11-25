export interface RoleClassifierInput {
  id: string;
  slug: string;
  titleKeywords: string[];
}

/**
 * Deterministic priority order so specific or composite roles match before broader ones:
 * - "Full Stack" before "Frontend" / "Backend"
 * - "Machine Learning Engineer" before "Data Scientist"
 */
const ROLE_PRIORITY_ORDER: string[] = [
  "full-stack-developer",
  "ml-engineer",
  "data-scientist",
  "data-analyst",
  "devops-engineer",
  "qa-engineer",
  "mobile-developer",
  "frontend-developer",
  "backend-developer",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(title: string, keyword: string): boolean {
  const trimmed = keyword.trim();
  if (!trimmed) return false;
  const escaped = escapeRegex(trimmed);
  const regex = new RegExp(
    `(?:^|[^A-Za-z0-9_+#.])(${escaped})(?=$|[^A-Za-z0-9_+#.])`,
    "i"
  );
  return regex.test(title);
}

export function classifyRole(
  title: string,
  roles: RoleClassifierInput[]
): string {
  const otherRole = roles.find((r) => r.slug === "other");
  if (!otherRole) {
    throw new Error('classifyRole requires an "other" fallback role');
  }

  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return otherRole.id;
  }

  const orderedRoles = [
    ...ROLE_PRIORITY_ORDER.map((slug) => roles.find((r) => r.slug === slug)).filter(
      (r): r is RoleClassifierInput => Boolean(r)
    ),
    ...roles.filter(
      (r) => r.slug !== "other" && !ROLE_PRIORITY_ORDER.includes(r.slug)
    ),
  ];

  for (const role of orderedRoles) {
    if (role.titleKeywords.some((kw) => matchesKeyword(normalizedTitle, kw))) {
      return role.id;
    }
  }

  return otherRole.id;
}
