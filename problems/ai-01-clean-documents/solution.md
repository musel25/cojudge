## Approach

Clean each text once. Keep a set of text values already accepted.

## Complexity

Time: O(C). Space: O(C), including output. C is the total number of input characters.

## Python reference

```python
import re

def solve(data: dict) -> dict:
    seen = set()
    documents = []
    for document in data["documents"]:
        text = re.sub(r"[ \t\n\r\f\v]+", " ", document["text"]).strip(" ")
        if text and text not in seen:
            seen.add(text)
            documents.append({"id": document["id"], "text": text})
    return {"documents": documents}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
