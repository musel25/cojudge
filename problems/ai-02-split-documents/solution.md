## Approach

Split each document into words. Move the start position by the step until a chunk reaches the end.

## Complexity

Time: O(C + W). Space: O(C + W), including output. C is the input text size. W is the total size of emitted chunks.

## Python reference

```python
import re

def solve(data: dict) -> dict:
    chunks = []
    size = data["chunk_size"]
    step = size - data["overlap"]
    for document in data["documents"]:
        text = document["text"].strip(" \t\n\r\f\v")
        words = re.split(r"[ \t\n\r\f\v]+", text) if text else []
        start = 0
        number = 0
        while start < len(words):
            end = min(start + size, len(words))
            chunks.append({"id": f"{document['id']}:{number}",
                           "document_id": document["id"],
                           "text": " ".join(words[start:end])})
            if end == len(words):
                break
            start += step
            number += 1
    return {"chunks": chunks}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
