## Approach

Check the schema and each required field. Parse dates only after checking the exact format. Keep all errors for an invalid record.

## Complexity

Time: O(n + C). Space: O(n + C), including output. C is the total size of the task strings.

## Python reference

```python
from datetime import date
import re

def solve(data: dict) -> dict:
    tasks = []
    errors = []
    for index, item in enumerate(data["tasks"]):
        problems = []
        if not isinstance(item, dict):
            problems.append("record")
        else:
            if set(item) - {"title", "priority", "due_date"}:
                problems.append("fields")
            title = item.get("title")
            title = title.strip(" \t\n\r\f\v") if isinstance(title, str) else ""
            if not title:
                problems.append("title")
            if item.get("priority") not in ("low", "medium", "high"):
                problems.append("priority")
            due = item.get("due_date")
            valid_date = isinstance(due, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", due)
            if valid_date:
                try:
                    date.fromisoformat(due)
                except ValueError:
                    valid_date = False
            if not valid_date:
                problems.append("due_date")
        if problems:
            errors.append({"index": index, "errors": problems})
        else:
            tasks.append({"title": title, "priority": item["priority"], "due_date": due})
    return {"tasks": tasks, "errors": errors}

# Supplied Cojudge adapter. Implement solve(data) above.
import json

class Solution:
    def run(self, payload: str) -> str:
        return json.dumps(solve(json.loads(payload)), ensure_ascii=True, allow_nan=False)
```
