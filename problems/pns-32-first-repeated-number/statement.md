## Learn

A set can tell you whether you saw a value before. Add each new value after you check it.

```python
seen = set()
seen.add(4)
print(4 in seen)  # True
```

This code prints:

```text
True
```

## Your task

Read one line of numbers. Show the first value that appears for a second time as you read left to right. Show -1 if no value repeats.

**Example 1**

Input:

```text
3 5 3 5
```

Result:

```text
3
```

Why: Reading from the left, the second 3 is the first repeat.

**Example 2**

Input:

```text
1 2 3
```

Result:

```text
-1
```

Why: Each value occurs once, so show -1.

Start with the supplied code. Change the code near the comment.
