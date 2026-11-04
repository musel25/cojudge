# Review cleanup implementation plan

> **For agentic workers:** Use the debugging and test-driven development workflows for behavior changes. Work on independent file sets in parallel. The coordinator owns commits and pushes.

**Goal:** Fix all findings in the code and agent-readiness review.

**Architecture:** Preserve SvelteKit, Docker, the UI, and saved-data formats. Move reusable behavior out of large pages and cloud synchronization. Use one runner factory and one isolated browser-test setup. Make type checks, tests, and builds reproducible.

**Tech Stack:** TypeScript, Svelte 5 (including existing legacy components), Node.js, Vitest, Playwright, Docker.

**Spec:** The review in this conversation, followed by the user's instruction, "fix all".

## Constraints

- Preserve learner data, custom content, authentication, and deployment settings.
- Do not use `~/cojudge` or live server progress for verification.
- Preserve existing user edits and `.playwright-mcp/`.
- Keep existing UI behavior and public module exports.
- Do not rewrite existing components to runes merely for style.
- Commit each coherent unit with a Conventional Commit message and push it immediately.
- The coordinator serializes commits. Parallel workers do not commit.

## Review focus

- Missing, corrupt, empty, or invalid official tests must not lead to acceptance.
- Runtime and browser-test configuration must use supported Node versions and isolated temporary data.
- Type fixes must preserve runner lifecycle and DOM behavior.
- Extracted page and cloud modules must preserve ordering, persistence, conflict protection, and image references.
- Browser test projects must receive their required fixtures without special undocumented commands.

## Tasks

- [ ] **Judge integrity and runner selection.** Reproduce the official-test fallback with failing tests. Reject unreadable and invalid official tests. Extract shared runner creation from API routes. Cover invalid test offsets and language selection. Run focused tests and the unit suite. Commit and push.
- [ ] **Type and accessibility checks.** Reproduce all 30 errors and 29 warnings with `npm run check`. Fix their causes in runners, DOM helpers, and Svelte components. Add behavior tests where behavior changes. Preserve style and layout. Run the unit suite and type checks. Commit and push.
- [ ] **Reproducible tooling.** Pin a supported Node major, declare the engine floor, and align Docker and contributor setup. Add the missing QR code types. Configure Playwright projects with isolated content/progress and fixture-specific servers. Add named verification scripts and CI type/browser checks. Verify fresh install, test collection, browser suites, and production build. Commit and push.
- [ ] **Cloud decomposition.** Extract snapshot validation and cloud storage responsibilities into focused modules. Keep `cloudSync.ts` as the synchronization controller. Add regression tests for malformed snapshots and account/revision checks. Run unit and cloud browser tests. Commit and push.
- [ ] **Page decomposition.** Extract home catalog behavior and playground file/search/editor responsibilities into modules or components with clear interfaces. Preserve browser behavior with the existing relevant tests. Run type checks, unit tests, and relevant browser tests. Commit and push.
- [ ] **Agent operating guide.** Rewrite `AGENTS.md` and align `CONTRIBUTING.md`. Include setup commands, ownership map, change-to-test matrix, temporary-data rules, repository content priority, target-course selection, and completion checks. Link deeper guides. Verify every command and path. Commit and push.
- [ ] **Final verification and review.** Run clean-install validation, strict type checks, all unit tests, all browser projects, production build, and problem verification where Docker is available. Obtain an independent code review. Fix material findings. Confirm the branch is pushed and report exact results.
