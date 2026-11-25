# Progressive Python assessments

Open **Assessments** from the Cojudge home page. Select a problem and start an attempt. Each problem has four levels. Edit one Python implementation as you advance.

- **90-minute assessment** starts a single timer. The timer continues if you reload or close the page. Send a submission before the deadline. The judge can finish processing a submission received before the deadline.
- **Unlimited learning** uses the same level rules with no time limit. Use **Check requirements** when the problem supplies a quiz for the current level. The quiz asks about validation, state changes, return values, and edge cases. Cojudge checks the 30 most recent submissions for the problem across attempts. If the same mistake category appears in at least two submissions, Cojudge offers a short drill.

Select **Run visible tests** to check the public cases for all unlocked levels. Select **Submit** to run the visible and hidden cases for those levels. All cases must pass to unlock the next level. A failure in an earlier level blocks the unlock. Submission history includes each source snapshot, the number of tests passed per level, and mistakes suggested by the tests. Progress shows the elapsed time at the first pass for each level.

Select **Save draft** before leaving to keep edits since the last run or submission. Open a saved attempt from **Attempt history** to continue or review its submissions.

Start Docker before running tests. The default image is `python:3.11-slim`. To prepare for offline use, pull the image once while online.

```sh
docker pull python:3.11-slim
```

Cojudge honors the configured Python runtime image. The assessment harness uses Python 3.11 and its standard library. Each run starts a fresh container with no network, a read-only root filesystem, 128 MiB of memory, and a five-second Python deadline. See [Python runtime setup](PYTHON_RUNTIME.md).

## Storage and privacy

The default content root is `~/cojudge`. Set `COJUDGE_CONTENT_DIR` to choose another root. Local attempts, drafts, and submission snapshots live in `assessment-progress/` under that root. A configured authenticated server saves them in `assessments/` within each learner's server progress directory. The app captures the problem pack when each attempt starts, so later edits to the pack apply to new attempts. See [server progress and profile setup](VPS-PROGRESS.md).

Cojudge shows requirements for unlocked levels and details for visible tests. Submission summaries show scores and mistake categories. The judge keeps expected results outside the execution container. The local machine's owner can inspect the problem packs, reference implementations, and progress files. Treat local assessments as practice.

For local use, open Cojudge on a loopback address such as `http://localhost:3000`. Network access to assessments requires a configured authenticated profile.

For production use behind a reverse proxy, set `ORIGIN` to the scheme, host, and port that the browser uses. For example, use `ORIGIN=https://cojudge.example.org` when the browser connects to that HTTPS address. SvelteKit checks this origin on form submissions.

## Add a custom problem

Create `assessments/<id>/pack.json` under your content root. For a repository contribution, put the pack in [the repository's assessments directory](../assessments/). A local pack with the same ID takes precedence for new attempts. Open the assessment list to load the pack or see a validation error.

Use version 1 of the JSON schema. See the [Tool Lending Desk pack](../assessments/tool-lending-desk/pack.json) for a complete example.

| Field | Format |
| --- | --- |
| `schemaVersion` | The number `1`. |
| `id` | The folder name. Use lowercase ASCII letters, digits, and single hyphens between groups. Limit 80 characters. |
| `title` | The public problem title. Limit 100 characters. |
| `summary` | The public description. Limit 1,000 characters. |
| `className` | The Python class with a constructor that takes no arguments. Use an ASCII letter first, followed by ASCII letters, digits, or underscores. Limit 80 characters. |
| `starter` | Initial Python source. Include stubs only for methods introduced in level 1. Limit 64 KiB in UTF-8. The editor uses the same limit for drafts and submissions. |
| `levels` | An array of exactly four level objects in order. |

Each level has these fields.

| Field | Format |
| --- | --- |
| `title` | The title shown when this level unlocks. Limit 100 characters. |
| `requirements` | Plain text with the method signatures, rules, and expected return values. Limit 8,192 characters. |
| `visible` | An array of 1 to 30 public cases. |
| `hidden` | An array of 1 to 30 cases for submissions. |
| `comprehension` | An optional object with `method` and `questions`. Use an unlocked method name with the same rules as `className`. Include exactly four questions. Each question has a `prompt`, 2 to 5 string `choices`, and the zero-based integer `answer` index. Limits are 500 characters for a prompt or choice. |

Each case has a nonempty `id` of up to 120 characters. Use unique IDs within each case array. Set `kind` to `requirements`, `state`, `validation`, or `edge`. Add 1 to 300 `steps`. Each step has the Python `method` name, a JSON array of positional `args`, and the `expected` JSON return value. Method names follow the `className` rules. The judge creates a new instance for each case and keeps its state between steps in that case. Return JSON-compatible Python values. Use `None` when `expected` is `null`.

Keep a custom pack under 512 KiB in UTF-8. Use finite JSON numbers. Integers must fit in JavaScript's safe integer range, from −9,007,199,254,740,991 to 9,007,199,254,740,991. Container values can nest 16 levels deep. Text fields must contain at least one non-whitespace character. The [schema source](../src/lib/server/assessments/schema.ts) defines all validation rules.

## Verify the problem

Write a separate `reference.py` for each problem. Treat the specification as the source of truth. Compare all visible and hidden expected values with the reference implementation. Test limits, empty and missing records, repeated operations, and the order of events. For randomized checks, use a fixed seed and compare operation sequences with a simple independent model. Keep each level's cases focused on its new behavior. Include interactions with earlier levels when the specification requires them.

Run the Python checks from the repository root. They use the standard library.

```sh
uv run --no-project --python 3.11 python -B -m unittest discover -s assessments -p 'test_*.py'
```

Run the sandbox integration tests with Docker available.

```sh
COJUDGE_TEST_ASSESSMENT_DOCKER=1 npm run test:unit -- src/lib/server/assessments/sandbox.test.ts
```

For a manual check, use a [temporary content directory](DEVELOPMENT.md#isolate-test-data). Confirm that the starter fails, a passing submission unlocks the next level, and a change that breaks an earlier contract cannot advance.
