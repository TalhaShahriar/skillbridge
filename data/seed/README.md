# Seed & Job Import Data

## `import-config.json`
Maps raw CSV column headers in `data/raw/jobs.csv` to SkillBridge `Job` fields. Update the right-hand column names to match your downloaded Kaggle CSV headers before running:

```bash
npm run import:jobs -- --file data/raw/jobs.csv --source "kaggle:<name>" --limit 1000
```

## `bd-jobs.json` (Manual Bangladesh Postings)
Add manually curated Bangladesh tech/data job postings to `data/seed/bd-jobs.json` and import with:

```bash
npm run import:jobs -- --bd
```

Example object (replace values and include a real `sourceUrl`):

```json
[
  {
    "title": "Junior Backend Developer (Node.js)",
    "company": "Example Tech BD",
    "location": "Dhaka, Bangladesh",
    "workMode": "ONSITE",
    "level": "ENTRY",
    "salaryMin": 40000,
    "salaryMax": 60000,
    "salaryCurrency": "BDT",
    "description": "Looking for a Junior Backend Developer with Node.js, Express, PostgreSQL, REST APIs, and Docker.",
    "postedAt": "2026-11-20",
    "sourceUrl": "https://example.com/jobs/123",
    "externalId": "bd-example-123"
  }
]
```

## Fallback Sample Jobs & Retagging
- Import 60 fictional sample jobs (`source: "sample"`): `npm run import:jobs -- --sample`
- Re-run skill extraction and role classification on all existing jobs (preserving `roleOverridden`): `npm run import:jobs -- --retag`
