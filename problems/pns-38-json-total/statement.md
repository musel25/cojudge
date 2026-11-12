## Learn

import brings a Python module into your program. json.loads() reads a JSON list such as [2, 3, 4].

**Idea en español:** import permite usar un módulo. json.loads() lee una lista en formato JSON.

```python
import json
nums = json.loads("[2, 3]")
print(nums)  # [2, 3]
```

## Your task

Read one JSON list of whole numbers. Show its sum. The input is always valid JSON. A list may be empty.

**En español:** Lee una lista JSON de números enteros. Muestra su suma.

**Example 1**

Input:

```text
[2, 3, 4]
```

Result:

```text
9
```

**Example 2**

Input:

```text
[]
```

Result:

```text
0
```

Start with the supplied code. Change the code near the comment.
