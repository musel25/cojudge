## Approach

Walk through the ranked chunks once. Ignore repeated IDs and keep the first occurrences that fit. Join their text after selection.

## Complexity

Time: O(n + C). Space: O(n + C), including output. C is the total size of selected text.

## Python reference

```python
def solve(data: dict) -> dict:
    ids = []
    texts = []
    used = 0
    seen = set()
    for chunk in data["chunks"]:
        if chunk["id"] in seen:
            continue
        seen.add(chunk["id"])
        if used + chunk["tokens"] <= data["budget"]:
            ids.append(chunk["id"])
            texts.append(chunk["text"])
            used += chunk["tokens"]
    return {"ids": ids, "context": "\n\n".join(texts), "used_tokens": used}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
