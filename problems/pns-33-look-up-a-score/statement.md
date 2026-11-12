## Learn

A dictionary can store a score for each name. get(key, 0) returns 0 when a name is missing.

```python
scores = {"ada": 7}
print(scores.get("ada", 0))  # 7
print(scores.get("bea", 0))  # 0
```

This code prints:

```text
7
0
```

## Your task

Read a count, then that many lines with a name and a score. Names are unique and use small lower-case letters. Read a query name. Show its score, or 0 if missing.

**Example 1**

Input:

```text
2
ada 7
bea 4
ada
```

Result:

```text
7
```

Why: The saved score for ada is 7.

**Example 2**

Input:

```text
1
ada 7
cal
```

Result:

```text
0
```

Why: There is no score for cal, so show 0.

Start with the supplied code. Change the code near the comment.
