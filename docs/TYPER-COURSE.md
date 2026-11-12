# Pybites Typer course

The seven exercises are available at
[the Typer course](https://cojudge.musel.dev/?course=pybites-typer).
Select Python.

Authoring files are in `capital-one-prep/cojudge/typer_path`. Content commits are
`97a2cf7` and `bfa48b8`. The course retains the source order. Its templates, tests,
and reference solutions are labeled recreations from the public descriptions.
The original premium templates and tests were not visible in the source account.

The course bundles real Typer 0.12.5, Click 8.1.7, Rich 13.9.4, and their pure-Python
dependencies. Each problem has a `python-libs.zip` archive with upstream licenses.
Application commit `b58c197` adds it to the Python runner path before learner code
loads. No dependency download occurs during Run or Submit. The playground and
debugger do not load problem archives.

## Deployment on October 28, 2026

The application was switched to `cojudge:typer-b58c197` on loopback port 5379.
It retains the existing environment, Docker socket, and `cojudge-trial-data`
volume. The old container is retained as `cojudge-profiles-pre-typer-b58c197`.
Later course deployments can replace the running image. Keep commit `b58c197`
or later in such images.

Private backups are in `/home/ubuntu/cojudge-backups/typer-20261028/`.
They include the prior container configuration, the environment at cutover,
and `progress-at-cutover.tar.gz`. Verification uses Run and Submit APIs and
does not mark learner problems complete or write learner solutions.

To roll back this application update, stop and remove the new `cojudge-profiles`
container, rename `cojudge-profiles-pre-typer-b58c197` to `cojudge-profiles`, and
start it. Do not restore progress from a backup unless recovery is required.
The prior application cannot run the Typer course because it cannot stage its
library archive. Keep the archive and course content for a later upgrade.

## Checks

- Application: 267 Vitest tests passed. The production build passed.
- Content: 146 repository pytest tests passed after the final course changes.
- The seven references pass 62 official cases. All seven starters are rejected.
- The 21 sample cases pass through Run.
- Seven explicit faulty implementations are rejected by the local verifier.
- The Rich table regression test first reproduced a `MarkupError` with bracket
  characters. The reference now uses literal Rich `Text` cells.
- The browser shows all seven problems in their source order.
- CLI `init` generates the Python templates for the first and last exercises.
