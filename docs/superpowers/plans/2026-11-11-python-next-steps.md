# Python Next Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 40 accessible Python script exercises as a new Cojudge course.

**Architecture:** Each exercise has a statement, metadata, official tests, Java marker, and Python answer. The course index fixes the order. The isolated problem verifier learns how to submit Python answers for script-mode problems.

**Tech Stack:** Cojudge content JSON and Markdown, Python scripts, Java markers, Node.js verification.

**Spec:** `docs/superpowers/specs/2026-11-11-python-next-steps-design.md`

## Global Constraints

- Keep Python First Steps, Basic 50, and learner data unchanged.
- Every problem has at least 25 valid official cases.
- Every statement uses short English, a short Spanish summary, and visible examples.
- Each answer explains its steps and boundary cases.
- Use number comparison for numeric output and token comparison for numeric lists.
- Source links identify inspirations; task text and cases are original.

## Review Focus

- Empty lists: tasks that allow one return an empty result or a stated zero.
- Boundary numbers: loop endpoints, age-like cutoffs, and negative values match the task text.
- Whitespace: numeric list answers with line breaks and spaces receive the same verdict.
- Letter case: string tasks state and test case behavior.
- Invalid input: only the Safe Integer task accepts invalid numeric text; all other inputs follow their stated contract.

---

### Task 1: Verify script-mode references

**Files:** `scripts/verify-problems.mjs`, `scripts/verify-submissions.js`, focused tests under `scripts/`.

**Interfaces:** The verifier reads a Python fenced answer from each script-mode `solution.md`, writes a temporary `Solution.py`, and calls the existing CLI Run and Submit paths. Standard Java problems retain the existing path.

- [ ] Write a failing focused test for script-mode reference selection.
- [ ] Run it and confirm that the current verifier cannot select Python.
- [ ] Implement the smallest script-mode path.
- [ ] Run focused tests and `npm run test:unit`.
- [ ] Review, commit `fix: verify Python script problem references`, and push.

### Task 2: Loops and functions

**Files:** `problems/pns-01-*` through `problems/pns-14-*`.

**Interfaces:** Each task uses `scriptMode: true`, stdin text, and one `Marker.program(String input)` method. Tasks 9–14 use a `def` in the starter and a supplied call below it.

- [ ] Define at least 25 normal and boundary inputs per problem.
- [ ] Write statements, Spanish summaries, hints, reference answers, and markers.
- [ ] Check each reference against its marker and run isolated verification for all 14 slugs.
- [ ] Review, commit `feat: add Python loops and functions lessons`, and push.

### Task 3: Lists and strings

**Files:** `problems/pns-15-*` through `problems/pns-28-*`.

**Interfaces:** One line of space-separated integers forms a list. The marker compares numeric list values. String tasks state whether case matters.

- [ ] Define at least 25 normal and boundary inputs per problem.
- [ ] Write statements, Spanish summaries, hints, reference answers, and markers.
- [ ] Check each reference against its marker and run isolated verification for all 14 slugs.
- [ ] Review, commit `feat: add Python lists and strings lessons`, and push.

### Task 4: Sets, dictionaries, and small programs

**Files:** `problems/pns-29-*` through `problems/pns-40-*`.

**Interfaces:** Tasks 29–34 use sets or dictionaries. Tasks 35–40 combine earlier skills and add errors, JSON, tuples, and one small class.

- [ ] Define at least 25 normal and boundary inputs per problem.
- [ ] Write statements, Spanish summaries, hints, reference answers, and markers.
- [ ] Check each reference against its marker and run isolated verification for all 12 slugs.
- [ ] Review, commit `feat: add Python collections and capstone lessons`, and push.

### Task 5: Course index and full review

**Files:** `courses/python-next-steps/courseinfo.json`, `courses/python-next-steps/SOURCES.md`.

**Interfaces:** The course index lists the 40 slugs in order and separates the six topic groups. Source notes link to Practice Python, CodingBat, and Exercism.

- [ ] Add the index and source notes.
- [ ] Check that every slug exists, every problem has at least 25 cases, and every starter runs.
- [ ] Run `npm run verify:problems` for all 40 slugs and `npm run verify` for the repository.
- [ ] Review the diff and commit `feat: publish Python Next Steps course index`.
- [ ] Push and open a reviewable pull request. Do not merge or deploy.
