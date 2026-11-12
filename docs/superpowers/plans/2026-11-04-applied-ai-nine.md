# Applied AI Nine Implementation Plan

> **For agentic workers:** Use the existing project workflow. Execute the content and Grind integration tasks in parallel. Use one independent final review.

**Goal:** Publish nine concise Python exercises in Cojudge and activate those same exercises in Grind Recall.

**Architecture:** Add native problem folders and an ordered `applied-ai-nine` course to Cojudge. Reuse its existing JSON adapter and Java marker interface. Import the new course into Grind alongside the unchanged archived Pybites catalog. Existing scheduling, reviews, notes, backups, and synchronization apply.

**Tech Stack:** Python standard library, Java markers, JSON content, existing TypeScript importer and React planner.

**Spec:** The user's approved six exercises, expanded to nine with document splitting, embedding caching, and citation checks. Keep problem statements concise and direct.

## Global Constraints

- Preserve all learner code, attempts, account data, catalog IDs, and archived Python exercises.
- Use topic branches. Commit explicit paths and push immediately after each commit.
- Publish only the new Cojudge content. Do not redeploy its application or change account data.
- Use Python `solve(data)` with a supplied JSON adapter. No paid API, network dependency, or extra Python packages.
- Keep descriptions short: task, input/output examples, explicit rules, and relevant constraints.
- Provide optional reference solutions, independently implemented Java markers, and at least 25 meaningful official cases per exercise.
- Use stable IDs `ai-01-clean-documents`, `ai-02-split-documents`, `ai-03-find-similar-documents`, `ai-04-build-context`, `ai-05-validate-extracted-tasks`, `ai-06-check-citations`, `ai-07-evaluate-search`, `ai-08-cache-embeddings`, `ai-09-retry-failed-requests`.

## Review Focus

- Equal similarity scores, zero vectors, empty input, and negative similarities have explicit outcomes.
- Chunk overlap always advances; whitespace rules and final chunk behavior are clear.
- Citation validation checks source membership, without claiming to prove factual support.
- Caching includes model identity and text; retry simulation distinguishes retryable and permanent outcomes.
- Adding nine exercises never reactivates the 72 archived Pybites exercises or changes stored data.

### Task 1: Cojudge content

Files: `problems/ai-*`, `courses/applied-ai-nine/courseinfo.json`, focused authoring/verification files under `scripts/` and tests under `tests/` or the authoring directory.

- [ ] Write manual expected cases for all nine contracts. Verify unfinished starters fail.
- [ ] Add Python references and independent Java markers. Check both against explicit expected cases and additional cases.
- [ ] Add short statements, examples, hints, solutions, metadata, and course order. Verify no reference implementation appears in starters.
- [ ] Run focused content tests, `npm run verify`, and `npm run verify:problems -- <all nine slugs>` using isolated content and progress.
- [ ] Review, commit, push, and open a PR based on the deployed fork branch.

### Task 2: Grind integration

Files: `scripts/import-cojudge.mjs`, `src/cojudge-courses.json`, related app text, tests, README, and architecture docs in the Grind worktree.

- [ ] Add failing tests for nine active AI problems, course order, links, scheduling, ratings, reviews, backups, and preservation of the 72 archived problems.
- [ ] Extend the importer with an optional second content root for `applied-ai-nine`, preserving old catalog fields and archive policy.
- [ ] Use the existing shared budget and FSRS logic. Keep the old courses menu removed. Make AI exercises accessible in All problems.
- [ ] Run `npm run check` and the full browser suite with temporary databases. Review, commit, push, and open a PR based on the archive branch.

### Task 3: Publication and verification

- [ ] Request one independent final review of the content and integration. Fix supported findings and run affected checks.
- [ ] Prepare an archive containing only the nine new problem folders and the one new course index.
- [ ] Verify live target paths and back up any matching files before publication. Do not replace unrelated content or learner progress.
- [ ] Publish problems first. Run correct and faulty Python submissions through the existing judge with no progress writes. Publish the course index after those checks pass.
- [ ] Deploy Grind with its existing script from a clean pushed branch. Verify the live build and all problem links.
- [ ] Report the course link, checks, PRs, and any remaining limits.
