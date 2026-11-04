# Cojudge agent guide

Cojudge is an offline-first code judge. It uses SvelteKit, TypeScript, Docker, and a Tauri desktop shell.

## Setup

- Use the Node.js version in `.nvmrc`. `package.json` defines supported versions.
- Run `npm ci` to install the locked dependencies.
- Run `npx playwright install --with-deps chromium` before browser tests.
- Docker is required for real execution and problem verification. It is not required for type checks or most unit and browser tests.
- Python maintenance scripts use `uv run python`. Do not use bare `pip`.
- Read [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for commands and environment details.

## Working rules

- Use a topic branch. Preserve unrelated user changes.
- Read the relevant code and tests before changing behavior.
- Fix the cause of a failure. Add a regression test for a behavior fix.
- Keep changes small. Extract a responsibility when a page or controller becomes difficult to review.
- Preserve saved-data formats, offline behavior, and API responses unless the task requires a change.
- Follow the style of the file. Existing Svelte legacy components and runes components are both supported. Do not convert a component merely for style.
- Keep semicolons and indentation consistent with the file. Avoid unrelated formatting changes.
- Use explicit types at API and storage boundaries. Validate external data. Do not suppress checks.
- Historical plans record past scope. They do not authorize a merge, deployment, or production-data change.

## Protect learner data

- Repository contributions belong in `problems/` and `courses/` in this repository.
- Runtime content normally lives in `~/cojudge`. Its files override bundled content. Do not edit that folder during a repository task.
- Use temporary content and progress directories for manual checks. Do not use a live server or browser profile as a test fixture.
- `npm run test:e2e` creates temporary content and progress for its build and servers.
- `npm run verify:problems` uses repository content, a separate server, and temporary CLI progress.
- Never commit learner code, browser storage, credentials, local backups, or runtime manifests.

## Code ownership map

| Area | Entry points |
| --- | --- |
| Home catalog and course visibility | `src/lib/home/`, `src/lib/components/home/` |
| Playground explorer and editor operations | `src/lib/playground/`, `src/routes/playground/+page.svelte` |
| Visual Markdown editor | `src/lib/components/playground/MarkdownEditor.svelte` |
| Problem runs and submissions | `src/routes/api/run/`, `src/routes/api/submit/`, `src/lib/runners/createProblemRunner.ts` |
| Language execution and debugging | `src/lib/runners/`, `src/lib/utils/*Util.ts`, `docker/` |
| Cloud synchronization policy and control | `src/lib/cloudSyncPolicy.ts`, `src/lib/cloudSync.ts` |
| Cloud snapshots and image storage | `src/lib/cloudSync/` |
| Local progress and recovery | `src/lib/progressBackup.ts`, `src/lib/stores/`, `src/lib/serverProgressClient.ts` |
| Server progress and profiles | `src/lib/server/serverProgress.ts`, `src/lib/server/progressProfiles.ts` |
| Content paths and seeding | `src/lib/server/contentPaths.ts`, `bin/lib/contentPaths.js` |
| CLI | `bin/cojudge`, `bin/lib/` |
| Desktop packaging | `src-tauri/`, [docs/DESKTOP.md](docs/DESKTOP.md) |

## Required verification

| Change | Checks |
| --- | --- |
| TypeScript or Svelte | `npm run check`, `npm run test:unit` |
| UI or browser storage | The checks above and the relevant `npm run test:e2e -- --project=<name>` project |
| Judging, markers, or problem content | Focused regression tests and `npm run verify:problems -- <slug>` |
| Language support | Runner tests and real Run, Submit, playground, and debugger checks for that language |
| CLI behavior | Relevant CLI tests and an isolated command smoke test |
| Documentation only | Check links, paths, and affected commands |

Before final review, run `npm run verify`. It checks types, unit tests, the production build, and all browser projects. Also run `npm run verify:problems` when execution or content changes. Report any check that cannot run and its reason.

Review the diff before each commit. Use a specific Conventional Commit message. Commit each completed unit separately. Push after every commit. Create a reviewable pull request. Merge or deploy only when the current session authorizes it.

## Add problems or languages

- Follow [docs/ADD_PROBLEMS.md](docs/ADD_PROBLEMS.md) for problem files and verification.
- Add each problem to the requested course. Do not assume every problem belongs in Blind 75.
- Keep `official-tests.json` valid and non-empty. A submission must report an error when official tests cannot load.
- For a personal-content task, edit the user content directory only when that task authorizes it. Use `COJUDGE_CONTENT_DIR` to select another location.
- Follow [docs/ADD_LANGUAGE.md](docs/ADD_LANGUAGE.md) for a language. Register its problem runner in `createProblemRunner.ts`. Update the playground, debugger, images, utilities, and starter code as required.
