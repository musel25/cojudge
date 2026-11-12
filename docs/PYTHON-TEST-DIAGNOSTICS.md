# Python course test diagnostics

Run and Submit show the executed test code, concrete arguments, returned values,
expected values or exceptions, failure details, and captured console text.
Submit uses the same test detail view as Run. Native operation tests show the
decoded input data instead of an escaped JSON string.

The Python runner adds diagnostics in memory. It does not edit saved learner
code or course content. Marker input and verdicts remain unchanged. Passing
results send display data through a separate console record. The API removes
that record before it presents console text.

Supported course adapters:

- `_PB_TESTS`: supplied tests, including Typer and its offline dependencies.
- `_PT_TARGET`: learner tests, coverage checks, and mutation checks.
- `_FA_TESTS` and `_SM_TESTS`: real pytest subprocesses, including cached suites.
- Native `ops` inputs: formatted structured input and existing judge outputs.

Diagnostic values use a bounded representation of built-in values. User objects
show their type. Diagnostics must not call learner `__repr__` or `__str__` methods
while a test runs. Pytest must not receive `--showlocals`, because rendering local
objects can change shared state and later verdicts. Error contexts and compared
values belong to the specific exception that caused the failure.

Runtime test details are display data. The editor excludes them from saved test
inputs, copied cases, and later execution requests. Editing an input clears its
previous runtime details.

## Verification on October 29, 2026

- 300 application tests pass. The production build passes.
- Five browser tests cover Run, Submit, concrete inputs, expected exceptions,
  console output, and copying a failed case.
- All 1,112 official starter cases in 103 supplied-test and test-writing problems
  produce useful diagnostics. This includes offline Typer archives.
- All 1,247 reference cases in 123 problems pass. Original and instrumented
  runners agree on every verdict. This includes all 20 FastAPI and SQLModel
  problems with real pytest.
- The 22 native operation problems have 704 official cases. Their runtime is
  unchanged; the shared input view formats their operation data.
- `npm run check` retains the existing 30 errors and 29 warnings. None refer to
  the changed files.

Course content used for the audits is in the sibling `capital-one-prep/cojudge`
repository. The application does not require that repository at runtime.

## Live deployment

The private application uses `cojudge:python-diagnostics-58ca4b0` on loopback
port 5379. It keeps the existing environment, content volume, and profile data.
The previous application is retained as
`cojudge-profiles-pre-python-diagnostics-58ca4b0`.

Private configuration and progress backups are under
`/home/ubuntu/cojudge-releases/python-diagnostics-58ca4b0/backup/` on the VPS.
No learner data is stored in this repository.

Both the isolated candidate and the live application passed API checks for the
reported color failure through Run and Submit. The same checks verified passing
and failing FastAPI tests and cached SQLModel results. These checks did not save
learner code or completion flags. Unauthenticated public requests still return
HTTP 401. The isolated candidate container was removed after verification.

To roll back, stop and remove the current `cojudge-profiles` container. Rename
the retained container to `cojudge-profiles`, then start it. Keep the data volume
and profile data unchanged.
