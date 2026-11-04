# Contributing to Cojudge

Use the Node.js version in `.nvmrc`. Install dependencies with `npm ci`.

Read [the development guide](docs/DEVELOPMENT.md) for setup, isolated test data, and the test matrix. [AGENTS.md](AGENTS.md) contains the same working rules for coding agents.

## Submit a change

1. Fork the repository if needed.
2. Create a topic branch.
3. Make one focused change.
4. Add a regression test when behavior changes.
5. Run the checks for that area.
6. Run `npm run verify` before final review.
7. Review the diff.
8. Commit with a specific Conventional Commit message.
9. Push the commit.
10. Open a pull request with the problem, resulting behavior, and test results.

For judging or content changes, also run `npm run verify:problems`. Keep learner data and credentials out of the change.

## Code style

- Use TypeScript with strict types at module boundaries.
- Follow the indentation and semicolon style of the file.
- Preserve existing Svelte syntax. Both legacy components and runes components are supported.
- Avoid unrelated formatting changes.
- Move reusable behavior into focused modules. Keep page components responsible for coordination and rendering.
- Validate external input. Report required-data failures instead of silently using weaker checks.

## Add content or a language

- [Add problems](docs/ADD_PROBLEMS.md). Repository contributions use `problems/` and `courses/`. Add each problem to its target course.
- [Add a language](docs/ADD_LANGUAGE.md).

## Report an issue

Open a [GitHub issue](https://github.com/cojudge/cojudge/issues). Include reproduction steps, expected behavior, actual behavior, and the OS, Node.js, and Docker versions.
