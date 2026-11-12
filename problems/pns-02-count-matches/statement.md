## Learn

A loop can read several input lines. A counter starts at 0. Add 1 each time a value matches the target.

```python
matches = 0
for value in [3, 2, 3]:
    if value == 3:
        matches += 1
print(matches)
```

This code prints:

```text
2
```

## Your task

Read a target number, then a count, then that many numbers. Show how many numbers equal the target. The count is 0 through 12.

**Example 1**

Input:

```text
3
4
3
2
3
3
```

Result:

```text
3
```

Why: The target is 3. It occurs three times in 3, 2, 3, 3.

**Example 2**

Input:

```text
5
0
```

Result:

```text
0
```

Why: The count is 0, so there are no numbers to compare.

Start with the supplied code. Change the code near the comment.
