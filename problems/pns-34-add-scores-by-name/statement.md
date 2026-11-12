## Learn

A name can appear more than once. Read its old total with get(), then add the new score.

```python
totals = {}
totals["ada"] = totals.get("ada", 0) + 3
print(totals["ada"])
```

This code prints:

```text
3
```

## Your task

Read a count, then that many name and score lines. A name may repeat. Add its scores. Read a query name. Show its total, or 0 if missing.

**Example 1**

Input:

```text
3
ada 2
bea 5
ada 4
ada
```

Result:

```text
6
```

Why: ada has scores 2 and 4. Their total is 6.

**Example 2**

Input:

```text
1
bea 5
ada
```

Result:

```text
0
```

Why: The only saved name is bea, so ada has a total of 0.

Start with the supplied code. Change the code near the comment.
