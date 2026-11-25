# Progressive Python Assessments Implementation Plan

**Goal.** Add original four-level Python assessments to Cojudge and a selectable study plan to Grind Recall.

## Architecture comparison

| Repository | Architecture | Execution and problem format | License and reuse |
| --- | --- | --- | --- |
| [Cojudge](https://github.com/cojudge/cojudge/tree/3d58df1133799d52569e0427b845b035aa30fcac) | SvelteKit and Tauri, with offline content, a Monaco editor, and local progress | Docker runner and a separate marker. Exercises use metadata, a statement, sample cases, official tests, and language starters. The format has one statement per exercise. | [MIT](https://github.com/cojudge/cojudge/blob/3d58df1133799d52569e0427b845b035aa30fcac/LICENSE). Extend the app and reuse its editor, Python image, image setup, and container labels. |
| [icf-practice](https://github.com/kartikangiras/icf-practice/tree/bd4043f0a01501e39a31c5d7d7c2615534b81017) | React, Vite, Monaco, and IndexedDB | A Pyodide worker runs four-level JSON packs and grades all unlocked levels. The browser bundle contains every level and hidden case. Python reference generators check expected outputs. | No explicit license at the reviewed commit. Use cumulative grading and reference validation as design ideas. |
| [Open Gauntlet](https://github.com/spartypkp/open-gauntlet/tree/a9f317a1908f396ad0a912fb07eb30f8c76723a2) | Next.js, Monaco, and filesystem-backed attempts | The host executes Python or JavaScript with a time limit. Each pack includes level Markdown, starter code, and JSON method traces. Submit grades the current level. API responses can reveal future descriptions and hidden test details. | [MIT](https://github.com/spartypkp/open-gauntlet/blob/a9f317a1908f396ad0a912fb07eb30f8c76723a2/LICENSE). Use the operation-trace format as a design idea. |
| [Fellowship Trainer](https://github.com/alecmeeeker/fellowship-trainer/tree/098191b0f5c325f2773e86f2969e273b63955e01) | Static browser app with local storage, exams, and short drills | A Pyodide worker runs Python tests. JavaScript modules contain the starter, level Markdown, tests, and reference code. Exams can run the unlocked levels. | No explicit license at the reviewed commit. Use short drills and recall as design ideas. |
| [Paul Lockett’s practice exercise](https://github.com/PaulLockett/CodeSignal_Practice_Industry_Coding_Framework/tree/6aab30450fc380a76ee631bbddff66a18853a8cf/practice_assessments/file_storage) | Standalone four-level file storage exercise | A single Python stub, four Markdown specifications, and four host-side unittest scenarios. The learner controls the timer and finishes each level manually. Some documented results disagree with tests. | No explicit license at the reviewed commit. Use its layout as a reference for manual authoring. |

## Design

Extend Cojudge in a dedicated assessment route. A server-only pack describes four ordered levels. Each level includes requirements and independent scenarios made of Python method calls and exact JSON return values. A scenario constructs a new instance and keeps its state between calls. The learner uses the same source file across levels. Keep the packs outside the normal problem assets route.

Use fresh resource-limited Python containers with networking disabled and a hard deadline. Pass only learner source and the inputs for the run to the container. Compare outputs with expected values in the judge. Run uses visible scenarios. Submit uses visible and hidden scenarios for every level through the current level. Send hidden aggregates and mistake categories to the browser. Keep future statements and reference code on the server.

Store attempts and immutable submission snapshots on disk, scoped to the authenticated Cojudge profile on configured servers and the device on a local installation. Use the server clock for a 90-minute assessment. Unlimited learning uses the same unlock rules. Record first completion time and per-level results. Freeze an attempt to its pack revision so edits do not change its test contract.

## Sequence and acceptance checks

1. **Working assessment.** Add the pack validator, sandbox, attempt store, editor route, and one original problem. Verify level gating, cumulative grading, saved source, hidden data handling, timer expiry, and sandbox failure handling before adding learning features.
2. **Authoring and coverage.** Document the versioned schema and add a second original problem. Cover CRUD, aggregation, scheduled actions, expiration, historical state, entity merging, rollback, permissions, quotas, and transactions across the two problems. Validate every fixture with an independent Python reference. Use deterministic randomized comparisons against separate models and boundary tests.
3. **Learning.** Attach a diagnostic to a failed submission when evidence supports one. Use repeated categories to select a short drill. Let a learner identify validation, state changes, return values, and edge cases for an unlocked method before coding.
4. **Grind Recall.** Add a selectable progressive Python study plan following the Python Next Steps pattern. Link each review item to its Cojudge assessment. Keep grading, code, and attempt history in Cojudge.
5. **Review.** Run focused tests, the real Python sandbox, the authoring checks, and each repository’s required checks. Open reviewable pull requests on topic branches.

## Review cases

- A previous-level regression blocks an unlock even if every new scenario passes.
- A late or stale submission cannot advance the attempt or overwrite a newer snapshot.
- A locked level, hidden case, or reference solution cannot appear in a learner response.
- Invalid packs fail validation. A missing Docker image or runner failure cannot pass a level.
- Grind Recall's existing account plans and records load with the same identifiers.
