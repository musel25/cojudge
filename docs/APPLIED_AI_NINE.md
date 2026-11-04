# Applied AI — 9 Exercises

[Open the list](https://cojudge.musel.dev/?course=applied-ai-nine).

Implement `solve(data)` in Python. The JSON adapter is supplied. Run checks the examples; Submit checks all official cases. Hints and reference solutions are optional. No API key or extra package is required.

| Order | Exercise |
| --- | --- |
| 1 | Clean documents |
| 2 | Split documents |
| 3 | Find similar documents |
| 4 | Build context |
| 5 | Validate extracted tasks |
| 6 | Check citations |
| 7 | Evaluate search |
| 8 | Cache embeddings |
| 9 | Retry failed requests |

The tasks use fixed vectors, supplied token counts, and deterministic cache/request inputs. Citation checks validate reference IDs; they do not determine whether an answer is true. The list practices components of an AI application. It does not test a live model or certify job readiness.

## Files and checks

Native content lives in `problems/ai-*` and `courses/applied-ai-nine/courseinfo.json`. Manual expected cases and the local Python/Java verifier live in `scripts/applied-ai-nine/`.

```sh
uv run --no-project --python 3.11 python scripts/applied-ai-nine/verify.py
npm run verify
npm run verify:problems -- ai-01-clean-documents ai-02-split-documents ai-03-find-similar-documents ai-04-build-context ai-05-validate-extracted-tasks ai-06-check-citations ai-07-evaluate-search ai-08-cache-embeddings ai-09-retry-failed-requests
```

The focused verifier checks independent Python and Java references against manual expectations. It also checks unfinished starters and rejects incorrect output. The repository verification commands use temporary content and progress.

## Grind Recall

Grind Recall imports the nine IDs in this order. They share the daily budget with Grind 75 and practiced LeetCode extras. Grind stores ratings, notes, time, and reviews. Cojudge completion flags are separate. The 72 retired Pybites exercises remain archived in Grind.

## Publication scope

Publish only these nine problem directories and this one course index. Publish the course index after correct Python submissions pass and incorrect output is rejected. Keep learner progress, other course indexes, and the application image unchanged.

Verified on 2026-11-04: 252 manual Python/Java checks, 232 official cases, nine native Java reference submissions, 422 app unit tests, and 115 browser tests passed. The independent review's cosine-rounding finding has a passing regression case.
