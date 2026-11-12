## Approach

Build a set of allowed IDs. Classify each answer by the presence and membership of its citations.

## Complexity

Time: O(s + c). Space: O(s + a), including output. s is the number of source IDs, c the number of citations, and a the number of answers.

## Python reference

```python
def solve(data: dict) -> dict:
    sources = set(data["source_ids"])
    valid = []
    invalid = []
    for index, answer in enumerate(data["answers"]):
        citations = answer["citations"]
        target = valid if citations and all(ref in sources for ref in citations) else invalid
        target.append(index)
    return {"valid": valid, "invalid": invalid}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
