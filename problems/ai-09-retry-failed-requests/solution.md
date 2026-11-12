## Approach

Walk through each request outcome list up to its attempt limit. Stop at success or a permanent error and record the last consumed outcome.

## Complexity

Time: O(a). Space: O(n), including output. a is the number of consumed outcomes. n is the number of requests.

## Python reference

```python
def solve(data: dict) -> dict:
    results = []
    temporary = {"timeout", "rate_limit", "server_error"}
    for request in data["requests"]:
        attempts = 0
        last = None
        for outcome in request["outcomes"][:data["max_attempts"]]:
            attempts += 1
            last = outcome
            if outcome not in temporary:
                break
        results.append({"id": request["id"], "status": "ok" if last == "ok" else "failed",
                        "attempts": attempts, "last_outcome": last})
    return {"results": results}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
