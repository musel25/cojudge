## Approach

Index the initial cache by model and text. Process each request once and append only new keys.

## Complexity

Time: O(C + V). Space: O(C + V), including output. C is the total key size. V is the total vector size.

## Python reference

```python
def solve(data: dict) -> dict:
    cache = [dict(item) for item in data["cache"]]
    lookup = {(item["model"], item["text"]): item["embedding"] for item in cache}
    embeddings = []
    calls = 0
    for request in data["requests"]:
        key = (request["model"], request["text"])
        if key not in lookup:
            lookup[key] = request["fresh_embedding"]
            cache.append({"model": key[0], "text": key[1], "embedding": lookup[key]})
            calls += 1
        embeddings.append(lookup[key])
    return {"embeddings": embeddings, "cache": cache, "calls": calls}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
