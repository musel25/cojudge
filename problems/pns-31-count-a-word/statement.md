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

Read a line of lower-case words, then one target word. Count how often the target appears. Words are separated by spaces. Show the count.

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

Start with the supplied code. Change the code near the comment.
