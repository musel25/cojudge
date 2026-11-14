## Learn

A loop can run inside another loop. This lets you visit every row and column pair in a grid.

```python
for row in range(2):
    for column in range(3):
        print(row, column)
```

This code prints:

```text
0 0
0 1
0 2
1 0
1 1
1 2
```

## Your task

Read the number of rows from the first line and the number of columns from the second line. Row and column positions start at 0. Count positions where row + column is even. Print the count. Both sizes use 0 through 10.

**Example 1**

Input:

```text
2
3
```

Result:

```text
3
```

Why: The positions with an even row + column are (0, 0), (0, 2), and (1, 1). There are three.

**Example 2**

Input:

```text
0
5
```

Result:

```text
0
```

Why: There are no rows, so there are no grid positions.

Write the full program. The starter comment is a reminder of the task.
