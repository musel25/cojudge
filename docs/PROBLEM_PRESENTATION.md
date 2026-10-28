# Custom problem presentation

Custom courses can supply two optional metadata fields alongside real input/output
examples:

```json
{
  "testCaseDescriptions": {
    "test_motorbike": {
      "title": "test_motorbike",
      "code": "bike = Motorbike(\"Yamaha\", \"R3\", 2, 321)\nassert bike.rev_engine() == \"Yamaha R3 with 2 wheels goes Vroom vroom!\""
    }
  },
  "courseHelp": {
    "title": "Course help",
    "body": "Keep the supplied tests and runner unchanged."
  }
}
```

The Test Case panel resolves a JSON `payload` selector with a `test` or `check`
field to the corresponding description. It shows the real code by default.
**Edit test selection** opens the selector editor. Adding a case opens its input
editor. Unknown selectors and ordinary function inputs remain editable.

These fields only affect presentation. The runner receives the original test
input. Course help appears in a closed section below the statement and examples.
Problems without these fields keep their existing display.

The nine custom courses are authored in `capital-one-prep`. Their presentation
refresh command updates only `statement.md`, examples, check descriptions, and
course help. It preserves execution code and tests. See `cojudge/PRESENTATION.md`
in that repository.

## Publication — October 28, 2026

Feature commit `968acc8` is live in the combined application image
`cojudge:no-legend-1b3fbdf`. This preserves the later home-page cleanup.
Content commit `03904a9` in `capital-one-prep` updates nine lists and 135 problems
with original descriptions, 244 concrete examples, and 1047 readable checks.
Only presentation fields and statements were changed. Existing tests, starter
code, runtime dependencies, course indexes, and learner data remain in place.

Verification: 275 unit tests, the production build, and three focused browser
tests pass. Type checking keeps the existing 30-error/29-warning baseline. The
content repository passes 165 tests. Live checks confirm all 135 presentations
and successful reference sample runs for each list. Browser checks confirm the
Vehicles task and literal output format, real examples, readable test assertions,
editable added cases, and closed Course help. Browser progress writes were blocked.

Prior metadata and statements are backed up outside the served volume under
`/home/ubuntu/cojudge-backups/clear-problems.GZZUeb/originals/`. The content
repository's `cojudge/presentation-verification.md` records the full checks and
recovery details.
