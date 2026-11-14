## Learn

A dictionary can hold a total for each name. get(name, 0) reads that total or gives 0 when the name is missing. In the task, update a name each time another score appears.

```python
totals = {"ada": 3}
print(totals.get("ada", 0))
print(totals.get("bea", 0))
```

This code prints:

```text
3
0
```

## Your task

Read a count from the first line. Read that many more lines. Each line has a lower-case name, a space, and an integer score. A name may repeat. Add all scores for each name. Read one query name after the score lines. Print its total, or 0 if absent.

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

Write the full program. The starter comment is a reminder of the task.
