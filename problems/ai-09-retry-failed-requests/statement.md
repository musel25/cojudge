Simulate bounded retries for failed model requests.

Implement `solve(data)`.

- Input fields: `requests` (`id`, `outcomes`) and `max_attempts`.
- Each outcomes list gives the result of each possible attempt, in order.
- `ok` succeeds. Stop that request immediately.
- `timeout`, `rate_limit`, and `server_error` are temporary failures. Retry if attempts and outcomes remain.
- `bad_request` and `unauthorized` are permanent errors. Stop that request immediately.
- `max_attempts` includes the first attempt. Consume at most that many outcomes for each request.
- If no success occurs before stopping, the final status is `failed`.
- Return `{"results": [{"id": "a", "status": "ok", "attempts": 1, "last_outcome": "ok"}]}`.
- Keep request order. `attempts` counts consumed outcomes. Each request starts with a new attempt budget.

This is a deterministic simulation. Do not send requests or wait between attempts. Real systems also need delay and jitter; those are outside this exercise.

**Constraints:** At most 100 requests. IDs are unique ASCII strings. Each outcomes list has 1 through 100 values from the six names above. `1 <= max_attempts <= 100`.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
