## Learn

A tuple can hold two values. You can unpack it into two names. abs() makes a difference non-negative.

```python
point = (2, 5)
x, y = point
print(x, y)  # 2 5
```

This code prints:

```text
2 5
```

## Your task

Read two points. Each line has x and y separated by a space. Show abs(x1 - x2) + abs(y1 - y2). This is the distance across grid rows and columns.

**Example 1**

Input:

```text
1 2
4 6
```

Result:

```text
7
```

Why: The horizontal difference is |1 - 4| = 3. The vertical difference is |2 - 6| = 4. Their sum is 7.

**Example 2**

Input:

```text
0 0
0 0
```

Result:

```text
0
```

Why: Both points are (0, 0), so each difference is 0.

Start with the supplied code. Change the code near the comment.
