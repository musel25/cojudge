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

Read a count from the first line. Read that many more lines. Each line has a lower-case name, a space, and an integer score. Names are unique. Read one query name after those lines. Print its score, or 0 if the name is absent.

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

Write the full program. The starter comment is a reminder of the task.
