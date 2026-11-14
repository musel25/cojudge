## Learn

A dictionary links a key to a value. Here, the key is a word and the value is its count.

```python
counts = {}
counts["cat"] = 2
print(counts["cat"])  # 2
```

This code prints:

```text
2
```

## Your task

Read one line of lower-case words separated by spaces. Read one target word from the next line. Print how many times the target word occurs in the first line. A missing word has a count of 0.

**Example 1**

Input:

```text
cat dog cat
cat
```

Result:

```text
2
```

Why: cat occurs twice in cat dog cat.

**Example 2**

Input:

```text
red blue
green
```

Result:

```text
0
```

Why: green does not occur in red blue, so its count is 0.

Write the full program. The starter comment is a reminder of the task.
