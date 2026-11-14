# Python Next Steps Independent Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Let the learner write each of the 40 Python programs while keeping every task and example clear.

**Architecture:** Edit the course authoring data in scripts/python-next-steps/. Regenerate the bundled problem files. Keep reference answers, Java markers, tests, input formats, and course order intact.

**Tech Stack:** Node.js course generator, Python scripts, SvelteKit problem catalog, Docker judge.

**Spec:** docs/superpowers/specs/2026-11-11-python-next-steps-design.md. The current request and merged problems 1–3 control the starter and explanation style where that historical spec differs.

## Global Constraints

- Give each learner starter one short task or input reminder comment and no executable solution code.
- Teach syntax with a separate Learn example that does not complete the task.
- State the input order, required output, and boundary behavior in the task text.
- Explain both shown results with concrete values.
- Keep optional hints conceptual. Do not give the completed condition, loop, or answer.
- Preserve all tests, markers, reference answers, course order, and script mode.
- Regenerate from source. Do not edit only the generated problem files.

## Review Focus

- Function and class tasks: the learner must know the required name and output format without a supplied implementation.
- Multi-line input: the statement must say which line contains each value.
- Empty input and zero counts: the task and examples must agree with the marker.
- String output: case, spaces, and blank output must be explicit.
- Learn examples: code output must match the displayed output and must not solve the task.

## Tasks

### Task 1: Loops 4–8

- [x] Edit loops.mjs starters, task text, Learn examples, and hints.
- [x] Update matching Learn outputs and example reasons in explanations.mjs.
- [x] Regenerate and review problems 4–8.

### Task 2: Functions 9–14

- [x] Edit functions.mjs and matching explanations.
- [x] Regenerate and review problems 9–14.

### Task 3: Lists 15–22

- [x] Edit lists.mjs and matching explanations.
- [x] Regenerate and review problems 15–22.

### Task 4: Strings 23–28

- [x] Edit strings.mjs and matching explanations.
- [x] Regenerate and review problems 23–28.

### Task 5: Sets and dictionaries 29–34

- [x] Edit collections.mjs and matching explanations.
- [x] Regenerate and review problems 29–34.

### Task 6: More Python 35–40

- [x] Edit more-python.mjs and matching explanations.
- [x] Regenerate and review problems 35–40.

### Task 7: Course-wide checks

- [x] Update the generator's default starter instruction and add a check that each starter contains only comments.
- [x] Run the course generator and confirm only the intended course files changed.
- [x] Run the course checker, full repository verification, and all 40 problem submissions.
- [x] Review the diff, commit each completed unit, push after each commit, and open a reviewable PR.
