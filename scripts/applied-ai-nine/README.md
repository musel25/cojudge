# Applied AI content verification

Run from the repository root:

```sh
uv run --no-project --python 3.11 python scripts/applied-ai-nine/verify.py
```

This uses the Python standard library, `javac`, and `java`. It does not use a network service, Docker, or learner data.

`cases.py` contains 232 manually specified official cases and 20 extra boundary cases. The verifier checks:

- Course order, metadata, and exact official inputs.
- The complete Python reference from the first Python block in each `solution.md`.
- Independent Java references against the same manual answers.
- Combined compilation of `Marker.java` and the judge's converted `Solution.java`.
- Rejection of unfinished Python starters.
- Rejection of invalid JSON, wrong result types, missing fields, and wrong answers.
- Acceptance of equivalent JSON with a different object key order or whitespace.

Do not derive expected answers from either reference. Update manual cases and `official-tests.json` together when a contract changes. Extra boundary cases stay outside the official case files.

The native judge check also requires Docker and the installed repository dependencies:

```sh
npm run verify:problems -- ai-01-clean-documents ai-02-split-documents ai-03-find-similar-documents ai-04-build-context ai-05-validate-extracted-tasks ai-06-check-citations ai-07-evaluate-search ai-08-cache-embeddings ai-09-retry-failed-requests
```

The Java JSON helpers and codec were adapted from `capital-one-prep/cojudge/problems/c1-01-strict-numeric-fields/Marker.java` at revision `2b2f6b9538b33df95bfbb93be08801aefbf00599`. Each marker keeps its helpers inside `Marker` to avoid class name collisions during native judge verification. Exercise reference methods were implemented separately from the Python references.
