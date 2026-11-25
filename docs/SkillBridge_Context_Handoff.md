# SkillBridge: Conversation Record and Handoff

**Purpose:** a continuity document so another AI (or a new chat) can pick up this project with no other context.
**Recorded on:** 25 Nov 2026 · **User:** Sheikh Talha Shahriar (CSE student, East West University, Dhaka)
**Companion file:** `SkillBridge_Updated_Plan.md` (the full one-week plan; attach it together with this file in the new chat).

---

## 1. Executive Summary

**Project:** SkillBridge, a web application for university students and fresh graduates that shows which skills employers want and how a student's own skills compare. It is a group project for **CSE479 Web Programming, Fall 2026, Section 03**, submitted to Md. Arman Hossain (Lecturer, CSE, East West University). Team name: **The CypherSynergy**. Team of 4: Rashmin Ahmed Rasha, Sheikh Talha Shahriar, Md Nazmul Hossen, Tanvir Adnan Turag.

**Original proposal (dated 7 Nov 2026):** an "AI-Powered Job Market Intelligence and Skill-Gap Analysis Platform" with heavy ML/NLP: spaCy skill extraction, sentence-embedding normalisation, TF-IDF + Logistic Regression job categorisation, hybrid embedding recommendations, a FastAPI Python service, ESCO taxonomy, and scraping of Bangladeshi job sites.

**What changed in this conversation:** time is very short (**about one week left from 25 Nov 2026**), so the user decided to **remove all custom AI/ML** and use **only the free Gemini API** for simple chat/automation ("add this, search this, show this"). The goal of the conversation was to produce a realistic, phased, time-limited plan before any coding starts. The user will do **AI-assisted coding with Claude Code** later.

**Where it ended:** a one-week plan file exists. The assistant proposed two defaults (Next.js single project on Vercel; hybrid dataset approach) and asked the user to reply "go" or request changes. The user has **not yet answered that**; instead they requested this handoff document.

---

## 2. Initial Context and Decisions

### 2.1 Original proposal (what existed before)
- **Roles:** Guest, Student (inherits Guest), Admin, plus ESCO API as an external actor.
- **Scope:** tech and data jobs only; focus on Bangladesh market with a global public dataset as fallback.
- **Planned stack:** React front end, Node/Express back end, PostgreSQL via Prisma, separate Python FastAPI service for NLP/ML.
- **MVP features (old):** guest dashboard, registration/login, skill profile, CV upload with skill extraction and normalisation, target role selection, skill gap, job recommendations, admin data import, categorisation, user/role/taxonomy management.
- **Optional (old):** email verification, password reset, learning suggestions, saving jobs, trend filters by time period, in-app model retraining.
- **Use cases:** Register, View Market Dashboard, Browse Job Trends, Login/Logout, Reset Password, Manage Personal/Skill Profile, Upload CV, Extract/Normalize Skills, Select Target Role, View Skill Gap, Learning Suggestions, Job Recommendations, Save Job, and admin use cases (Manage Users/Roles/Resources/Taxonomy, Collect/Import Job Data, Categorize Job, Review Extracted Skills, Train/Evaluate Models).

### 2.2 Decisions made in this conversation (chronological)
1. **Remove custom AI/ML.** No FastAPI, spaCy, embeddings, classifier, or model training/evaluation. The only AI is the **Gemini free API**, used for automation.
2. **Format:** deliver plans as a **Markdown file**, not a PDF.
3. **Coding approach:** the user will code with Claude Code. **No prompts needed yet; decide the plan first.** The assistant may ask for more info.
4. **Phased plan with time limits:** must-do first, extras only if time allows.
5. **CV auto-fill added (user suggestion):** uploading a CV should automatically set up profile details. Implemented through Gemini (structured JSON), replacing the old spaCy CV parser.
6. **Answers to open questions:**
   - Deadline: almost **one week**.
   - **No revised proposal** needed.
   - A Gemini-based simple chat/automation feature is **acceptable** for the course.
   - Dataset: user was **confused and leaned toward not using a dataset**; asked for brainstorming of the optimal option, including what will be left as future work.
   - Hosting: maybe **Vercel**; database **Supabase**; **Google sign-in** to be set up.
   - Language: **English** is the priority (assistant is English only).
   - Sending CV text to Gemini: **no issue**.
7. **Recommended (not yet confirmed by user):**
   - **Dataset: hybrid.** Role requirements curated by hand + about 500–1,000 real tech job postings from one public CSV (e.g. a Kaggle job-postings dataset, license to be checked) + optional 20–30 manually entered Bangladesh postings with source links. Time cap 4 hours on Day 1; fallback to a hand-made sample set if the CSV is bad.
   - **Stack shape:** one **Next.js (React) project on Vercel** with API routes + Prisma → Supabase, instead of a separate Express server. Alternative: Vite React + Express (needs a second deployment). Logic should live in plain service files so either works.
   - **Auth:** **Supabase Auth with Google** replaces custom register/login/password hashing; backend verifies the Supabase token and maps it to a local `User` row holding the role. First Admin set by seed/SQL.

### 2.3 Final scope (current plan)
**Core app, works without AI:** Google sign-in + role-based access; public dashboard with charts and role filter; job browse/search; profile + skill profile; target role → skill gap (matched, missing, readiness %); job recommendations (weighted skill overlap); minimal admin (users block/unblock, role-weights editor, CSV import, fix a job's role).
Skill list/aliases and role definitions are managed via **seed files**, not admin screens.

**Gemini features** (rule: Gemini only returns JSON; the backend validates it and does the work; Gemini never touches the DB):
- **Assistant (chat):** student actions `add_skills`, `remove_skills`, `set_target_role`, `search_jobs`, `show_skill_gap`, `show_recommendations`; about 2 small admin actions (e.g. `block_user`). Whitelisted actions, Zod validation, role checks, confirm button for destructive actions, skill names normalised via alias table (unknown skills are never created blindly), per-user rate limit, `AssistantLog`, graceful failure.
- **CV auto-fill:** upload PDF/DOCX (about 2 MB max) → extract text (`pdf-parse`/`mammoth`) → strip phone/address/email with regex → Gemini returns fixed JSON `{education[], experienceLevel, interests[], skills[]}` with null for anything not in the CV → normalise skills via aliases, unmatched go to an "unrecognised" list → **review screen (current vs from CV); nothing saved until the student confirms** → save, then discard file and text. Scanned PDFs unsupported (manual entry message). Fallback if Gemini is down: keyword matcher fills skills only. Privacy notice shown before upload.

### 2.4 No-ML logic (how it works)
- **Job → skills:** match skill names and aliases in job descriptions (word boundaries; stricter rules for short terms like `R`, `Go`, `C`); use a skills column if the CSV has one.
- **Job → role:** title keyword rules, fallback "Other", Admin override.
- **Readiness %** = sum(weights of skills the student has) / sum(weights of required skills).
- **Job match score** = sum(weights of job skills the student has) / sum(weights of job skills); show matching and missing skills.

### 2.5 Draft data model
`User(authId, email, role, blocked)` · `Profile(education, level, interests, targetRoleId)` · `Skill(name, category)` · `SkillAlias(alias, skillId)` · `UserSkill(userId, skillId, level)` · `JobRole(name)` · `RoleSkill(roleId, skillId, weight)` · `Job(title, company, location, workMode, level, salaryMin/Max, description, postedAt, source, roleId)` · `JobSkill(jobId, skillId)` · `AssistantLog(userId, input, action, status)`. CV files and text are never stored.

---

## 3. Key Data and Evidence

### 3.1 Proposal facts worth keeping
- Problem: students can't tell what skills employers want; job posts use inconsistent skill names ("JS", "JavaScript", "ECMAScript"); job sites list vacancies but don't show overall demand or what to study.
- Planned roles for categorisation: Data Analyst, Data Scientist, ML Engineer, Frontend, Backend, Full-stack, DevOps, QA, Mobile.
- Data sources in the proposal: scraped permitted Bangladeshi sources (robots.txt/ToS check), Kaggle-type fallback datasets, ESCO skills. Only the dataset fallback idea survives in the new plan.

### 3.2 Why data is still needed
The dashboard, job search and recommendations need job postings. The skill gap needs only curated role requirements. So the question is *how much* job data, not whether to have any.

### 3.3 Dataset options compared
| Option | Verdict |
|---|---|
| A. Hand-made only (about 10 roles, 60–100 sample jobs) | Fast but dashboard numbers look invented; fallback only |
| B. Public CSV only | Real data and a real import feature, but global and messy |
| C. Gemini-generated jobs | Synthetic data posing as market data; not recommended |
| **D. Hybrid (recommended)** | Curated role requirements + about 500–1,000 real postings + optional manual Bangladesh postings |

The UI must always state the data source (e.g. "Based on <dataset>, N postings") and must not claim live Bangladesh market data.

### 3.4 One-week schedule (starts 25 Nov 2026)
| Day | Focus | Done when |
|---|---|---|
| 1 | Setup, Supabase, Google OAuth, **deploy empty app to Vercel**, skill list + roles, pick/clean CSV (4-hour cap) | Everyone runs locally; Google sign-in works locally and on Vercel; data chosen |
| 2 | Auth mapping + RBAC, import script + tagging, profile/skills CRUD | User signs in and adds skills; jobs tagged in DB |
| 3 | Skill gap, job search, recommendations, dashboard queries | Gap and recommendations work with real data |
| 4 | Dashboard charts, admin basics, assistant backend | Dashboard live; assistant handles 4+ actions via API |
| 5 | Chat UI, CV auto-fill | 6 student actions via chat; CV fills profile after confirm |
| 6 | **Feature freeze**, test all roles, 30 assistant prompts, 5 real CVs, fixes | Full demo works on deployed URL |
| 7 | Buffer, check Supabase isn't paused, env vars, README, rehearse demo twice | Demo ready |

**Suggested team split:** A = auth/RBAC/Prisma-Supabase/deployment; B = data import, tagging, gap and recommendation logic; C = student UI and chat UI; D = admin UI, assistant backend, CV upload, testing.

### 3.5 Cut list (cut from the top when behind)
Role-weights editor (use seed file) → "fix job role" (use seed/DB) → admin assistant actions → dashboard role filter → **CV auto-fill** → job filters beyond keyword search.
**Never cut:** Google auth + RBAC, skill profile, skill gap, recommendations, dashboard, basic Gemini assistant, deployment.

### 3.6 Future work (not in this version, to state honestly in the report/demo)
Trained job-role classifier with precision/recall/F1 evaluation; spaCy extraction and embedding-based normalisation/recommendations; live Bangladesh data via permitted scraping or APIs; time-based trends; ESCO taxonomy; learning suggestions; saved jobs; admin skill/alias screens and review queue; in-app retraining; email verification/password reset/notifications; Bangla input; scanned-CV OCR; skill-gap history.

### 3.7 Known risks and mitigations
- Gemini free-tier limits/downtime → rate limit, graceful errors, keyword fallback (check current limits in Google AI Studio).
- Google sign-in breaking after deploy → add the Vercel URL to Supabase redirect/site URL and Google OAuth settings on Day 1.
- Prisma + Supabase on Vercel → pooled connection URL at runtime, direct URL for migrations.
- Serverless time limits for CV + Gemini → short text, timeouts, progress state.
- Bad dataset → 4-hour cap, fallback to curated sample.
- Ambiguous skills (`R`, `Go`) → stricter matching, hand review of skill list.
- Supabase free projects can pause when inactive → check before demo.

### 3.8 Glossary
- **Skill gap:** difference between a student's skills and a target role's required skills.
- **Readiness %:** weighted share of required skills the student already has.
- **Alias table / normaliser:** maps variants ("JS") to one standard skill ("JavaScript").
- **RBAC:** role-based access control (Guest/Student/Admin).
- **Whitelist (assistant):** fixed list of actions Gemini may request; anything else is rejected.
- **MVP:** must-deliver features. **Cut list:** what to drop first when behind.
- **ESCO:** European skills taxonomy from the original proposal; now optional/future.
- **Supabase Auth:** hosted authentication (Google sign-in); **Prisma:** ORM for Postgres; **Zod:** schema validation library.

---

## 4. Current Status and Pending Tasks

**Done:**
- Original proposal reviewed and analysed.
- Decision to drop custom AI/ML and use Gemini only.
- CV auto-fill added to scope.
- One-week plan written (`SkillBridge_Updated_Plan.md`), including schedule, cut list, future work and risks.
- No code has been written yet.

**Waiting on the user (defaults written into the plan):**
1. Confirm or change the **stack shape** (default: single Next.js project on Vercel; alternative: Vite React + Express).
2. Confirm or change the **dataset approach** (default: hybrid; user was unsure about using a dataset at all).

**Next steps once confirmed:**
1. Lock the final plan and Day 1 checklist.
2. Choose the specific public CSV (check columns, license) and draft the skill list (about 150–250 skills with aliases) and about 10 role definitions with weights.
3. Finalise the API route list and Prisma schema.
4. Only then, prepare Claude Code prompts (the user explicitly said **not yet**).

---

## 5. Restrictions and Constraints

**Process rules agreed:**
- Plan first; **do not write Claude Code prompts yet**.
- Deliverables as **Markdown (.md) files**, no PDF.
- The assistant may ask for more information or context when needed.
- Keep must-do work separate from "if time allows" work, with explicit time limits per phase and a cut list.
- Also record what will *not* be built (future work).

**Product constraints:**
- About **7 days** total from 25 Nov 2026; feature freeze at the start of Day 6.
- **Gemini free API is the only AI**; no model training, no FastAPI, no embeddings.
- Gemini returns JSON only; backend validates, authorises and executes; Gemini never accesses the database.
- **English only** for the assistant.
- Tech and data jobs only.
- Hosting: **Vercel + Supabase**; **Google sign-in** via Supabase Auth.
- No CV files or CV text stored; contact details stripped before sending to Gemini; privacy notice before upload; nothing saved from a CV until the student confirms.
- Do not present sample or global data as live Bangladesh market data; always show the data source.
- **No revised proposal** is required.

**Team and tooling:** 4-person team; coding will be AI-assisted with Claude Code; the user's own working style favours concrete, step-by-step, actionable checklists.
