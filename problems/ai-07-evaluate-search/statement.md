Measure how often search finds a relevant document for a question.

Implement `solve(data)`.

- Input fields: `questions` (`id`, `retrieved`, `relevant`) and `k`.
- A question succeeds if any of its first `k` retrieved IDs occurs in its relevant IDs.
- Compare IDs exactly. Duplicate retrieved IDs still consume positions.
- A question with no retrieved IDs or no relevant IDs fails.
- `hit_rate` is successful questions divided by all questions.
- Round the rate to six decimal places. Round an exact half upward. JSON numbers need no trailing zeros.
- Return `{"hit_rate": 0.5, "failed_ids": ["q2"]}`.
- Keep failed question IDs in input order. With no questions, return a rate of 0 and an empty list.

**Constraints:** At most 100 questions. Question IDs are unique ASCII strings. Each retrieved or relevant list has at most 100 nonempty ASCII IDs. `0 <= k <= 100`.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
