## Learn

append adds one item to the end of a list. Build a new list when you want to keep only some items.

```python
small = []
small.append(2)
print(small)  # [2]
```

This code prints:

```text
[2]
```

## Your task

Read one line of space-separated integers. Read the limit from the next line. Print each integer that is smaller than the limit, in its original order. Separate results with spaces or new lines. If none qualifies, print nothing.

**Example 1**

Input:

```text
8 2 5 1
5
```

Result:

```text
2 1
```

Why: Only 2 and 1 are below 5. Keep them in that order.

**Example 2**

Input:

```text
7 8
3
```

Result:

_No output_

Why: Neither 7 nor 8 is below 3, so there is no output.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
