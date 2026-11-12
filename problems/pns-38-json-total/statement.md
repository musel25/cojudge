## Learn

import brings a Python module into your program. json.loads() reads a JSON list such as [2, 3, 4].

```python
import json
nums = json.loads("[2, 3]")
print(nums)  # [2, 3]
```

This code prints:

```text
[2, 3]
```

## Your task

Read one JSON list of whole numbers. Show its sum. The input is always valid JSON. A list may be empty.

**Example 1**

Input:

```text
[2, 3, 4]
```

Result:

```text
9
```

Why: The JSON list contains 2, 3, and 4. Their sum is 9.

**Example 2**

Input:

```text
[]
```

Result:

```text
0
```

Why: The empty list has a sum of 0.

Start with the supplied code. Change the code near the comment.
