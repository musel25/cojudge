## Approach

Test each retrieved prefix for a relevant ID. Count successes and keep the IDs of failed questions.

## Complexity

Time: O(C). Space: O(q + u), including output. C is the total number of input IDs. q is the number of questions. u is the largest relevant list.

## Python reference

```python
def solve(data: dict) -> dict:
    failed = []
    for question in data["questions"]:
        relevant = set(question["relevant"])
        if not any(key in relevant for key in question["retrieved"][:data["k"]]):
            failed.append(question["id"])
    count = len(data["questions"])
    successes = count - len(failed)
    scaled = (2 * successes * 1_000_000 + count) // (2 * count) if count else 0
    return {"hit_rate": scaled / 1_000_000, "failed_ids": failed}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
