# Development and verification

## Setup

Use Node.js 22.21.0, as recorded in `.nvmrc`. The supported engine range is in `package.json`. If you use nvm, run `nvm use`.

```sh
npm ci
npx playwright install --with-deps chromium
```

The lockfile controls dependency versions. Use `npm install <package>` only when intentionally changing dependencies. Commit `package.json` and `package-lock.json` together.

Docker is required for real judging, playground execution, debugging, and problem verification. Browser tests stub execution where needed. The browser projects do not require a cloud account.

The application runs without Firebase settings. Set the values in `.env.example` only when testing cloud authentication or a configured desktop build. Do not commit `.env` files.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run check` | Check TypeScript and Svelte diagnostics |
| `npm run test:unit` | Run unit and route tests once |
| `npm test` | Start the interactive Vitest watcher |
| `npm run test:unit -- src/lib/home/catalog.test.ts` | Run one unit test file |
| `npm run test:e2e` | Build and run every browser project with temporary data |
| `npm run test:e2e -- --project=general e2e/playground-folders.test.ts` | Build and run focused browser tests |
| `npm run verify` | Run type checks, unit tests, the build, and browser tests |
| `npm run verify:problems` | Check repository test counts and reference submissions with Docker |
| `npm run verify:problems -- two-sum` | Verify one repository problem |
| `npm run build` | Create the production application |
| `npm run desktop:dev` | Start desktop development; see [DESKTOP.md](DESKTOP.md) |

`npm run check` must finish with zero errors and zero warnings. Do not treat a successful build as a type check. Old deployment notes can contain historical diagnostic counts. They are not the current acceptance criteria.

## Isolate test data

The server and CLI normally prefer editable content in `~/cojudge`. CLI progress normally lives in `~/.cojudge`. Server progress can use a separate configured directory. Repository tests must not change those locations or contact a running learner server.

The browser runner creates temporary directories before the build. Each browser project starts its own server with its own content and progress settings. The runner does not reuse a server already bound to a test port. Test browser contexts start with separate browser storage.

The problem verification runner uses the repository's bundled content. It starts its own server on a free port and directs CLI progress to a temporary file. It stops that server and removes temporary files when verification ends.

`COJUDGE_PROGRESS_FILE` selects a separate CLI progress file. The default remains `~/.cojudge/progress.json`. Use an absolute temporary path for manual CLI tests. The problem verification runner sets this variable automatically.

For manual development checks, select a temporary content directory and disable server progress:

```sh
COJUDGE_CONTENT_DIR="$(mktemp -d /tmp/cojudge-dev.XXXXXX)" \
COJUDGE_SERVER_PROGRESS_DIR= COJUDGE_SERVER_PROGRESS_ORIGIN= \
npm run dev -- --host 127.0.0.1
```

Use a separate browser profile for manual storage and recovery checks. Do not restore a test backup into a learner profile. Do not run a content reset against a live installation.

## Browser projects

All projects run through `npm run test:e2e`. No extra enable flag is required.

| Project | Port | Coverage and fixtures |
| --- | --- | --- |
| `general` | 4173 | Bundled catalog, editor, folders, Markdown, whiteboard, sharing, and local progress |
| `problem-presentation` | 4186 | Custom Vehicles exercise and assertion result presentation |
| `learning-path` | 4177 | Temporary course and problem catalog for the learning path |
| `server-progress` | 4175 | Temporary progress repository and authenticated profile headers |

The previous `playwright.*.config.ts` entry points remain available. Prefer the named projects in the default command. Traces for failed tests are kept under `test-results/` and uploaded by CI.

## Choose checks by change

- For a pure helper, run its focused tests and the unit suite.
- For an API change, test its request and response behavior. Use Docker for execution changes.
- For UI, storage, keyboard, or focus behavior, run the relevant browser tests.
- For cloud or profile changes, test conflicts, account changes, offline edits, restore, and malformed data. Use temporary fixtures.
- For content, run test counts and a reference submission for each changed problem.
- Before final review, run `npm run verify`. Add `npm run verify:problems` for judging or content changes.

## Structure and style

See [AGENTS.md](../AGENTS.md) for the ownership map. Home behavior belongs in `src/lib/home/` and `src/lib/components/home/`. Playground helpers belong in `src/lib/playground/`. Cloud storage belongs in `src/lib/cloudSync/`; the top-level controller coordinates authentication and synchronization.

Follow the syntax and formatting of the file being changed. Do not mix a runes migration with a behavior fix. Prefer explicit interfaces and small modules to new branches inside large pages.

Use a topic branch. Commit each tested unit separately. Push each commit. Open a pull request. Plans and deployment records do not authorize a new production change.
