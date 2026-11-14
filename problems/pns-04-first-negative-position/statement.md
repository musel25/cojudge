## Learn

break stops a loop early. Positions start at 0. Save the first matching position before you stop.

```python
for position in range(4):
    print(position)
    if position == 1:
        break
```

This code prints:

```text
0
1
```

## Your task

Read the count from the first line. Read that many integers, one per line. Print the position of the first negative integer. Positions start at 0. Print -1 if none is negative. The count is 0 through 12.

**Example 1**

Input:

```text
4
5
-2
-3
7
```

Result:

```text
1
```

Why: The first negative number is -2 at position 1. Positions start at 0.

**Example 2**

Input:

```text
3
1
2
3
```

Result:

```text
-1
```

Why: All three numbers are positive, so no negative number has a position.

Write the full program. The starter comment is a reminder of the task.
