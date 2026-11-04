## Approach

Compute each cosine score, with a separate case for zero vectors. Round the scores and sort by descending score, then ascending ID.

## Complexity

Time: O(nd + n log n). Space: O(n). n is the number of documents. d is the vector dimension.

## Python reference

```python
import math

def solve(data: dict) -> dict:
    query = data["query"]
    query_length = math.sqrt(sum(value * value for value in query))
    ranked = []
    for document in data["documents"]:
        vector = document["vector"]
        length = math.sqrt(sum(value * value for value in vector))
        dot = sum(a * b for a, b in zip(query, vector))
        score = dot / (query_length * length) if query_length and length else 0
        ranked.append((round(score, 12), document["id"]))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return {"ids": [key for score, key in ranked[:data["k"]]]}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
