# CLAUDE.md — SkillBridge

## Project
SkillBridge: web app for university students/fresh grads showing which skills employers want and how the student's skills compare. CSE479 Web Programming group project (4-person team, ~1 week deadline). Tech & data jobs only.
Roles: Guest (public), Student, Admin.
Core app works without AI (public dashboard, job browse/search, profile + skill profile, target role gap, job recommendations, minimal admin). Skills/aliases and role definitions are managed via seed files, not admin screens.

## Stack (fixed — do not change)
- Next.js (App Router, TypeScript, `src/` dir), Tailwind CSS, shadcn/ui, Recharts
- Prisma 6.x (pinned) → Supabase Postgres. `DATABASE_URL` = pooled (runtime), `DIRECT_URL` = direct (migrations)
- Supabase Auth with Google only (`@supabase/ssr`). No custom passwords.
- Gemini via `@google/genai`, model from env `GEMINI_MODEL`. Gemini is the ONLY AI. No ML, no embeddings, no Python.
- Zod for all input validation. Vitest for unit tests.
- Deploy: Vercel. English UI & assistant only.

## Architecture rules
- Business logic lives in plain TS service files in `src/server/services/*` (no Next imports there) so it is testable.
- Route handlers in `src/app/api/**` are thin: auth check → zod parse → call service → JSON.
- All DB access through `src/server/db.ts` (Prisma singleton).
- Auth helpers in `src/server/auth.ts`: `getCurrentUser()`, `requireUser()`, `requireAdmin()`. Blocked users are treated as signed out.
- Gemini rule: Gemini only returns JSON. Backend validates with Zod, authorises, then executes. Gemini never touches the DB. Normalise skills via `SkillAlias` (never create unknown skills blindly); enforce per-user rate limits, log to `AssistantLog`, and fail gracefully.
- Never store CV files or CV text. Strip emails/phones/addresses before sending text to Gemini. Show a review screen (nothing saved until the student confirms), then discard file and text.
- Never claim data is live Bangladesh market data. Always show data source (`DATASET_NAME`, N postings).

## Scoring logic (no ML)
- Job→skills: match skill names + aliases in description with word boundaries; short/ambiguous terms (`R`, `Go`, `C`, `C#`, `.NET`) need stricter rules (also use CSV skills column if present).
- Job→role: title keyword rules, fallback `"Other"`, admin override.
- Readiness % = `sum(weights of required skills the student has) / sum(weights of required skills) * 100`.
- Job match % = `sum(weights of job skills the student has) / sum(weights of job skills) * 100` (weight from target role's `RoleSkill`, default 1).

## Working rules for Claude Code
- Token-efficient: use grep/rg and targeted line-range reads. Never read whole large files. For CSVs use head/wc only.
- Before coding, show a short plan (files to create/modify). Keep changes scoped to the current task.
- Do not add features not asked for. Do not add new dependencies without saying why.
- After changes, run: `npm run lint && npx tsc --noEmit && npm test` (when tests exist). Fix errors before finishing.
- Never commit `.env*`. Never print secrets.
- End each task with: what changed, how to verify manually, anything left TODO.

## Commands
- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — typecheck
- `npm test` — run Vitest (`vitest run`)
- `npm run db:migrate` — `prisma migrate dev`
- `npm run db:deploy` — `prisma migrate deploy`
- `npm run db:seed` — `tsx prisma/seed.ts`
- `npm run import:jobs` — `tsx scripts/import-jobs.ts`
