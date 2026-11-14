## Learn

A list keeps its order. You can use indexes to place items in a new order.

```python
values = [5, 8, 2]
print(values[1])  # 8
```

This code prints:

```text
8
```

## Your task

Read one line with exactly three space-separated integers. Move the first integer to the end. Print the three integers in their new order, separated by spaces or new lines. For 5 8 2, print 8 2 5.

**Example 1**

Input:

```text
5 8 2
```

Result:

```text
8 2 5
```

Why: Move 5 to the end of 5, 8, 2. The new order is 8, 2, 5.

**Example 2**

Input:

```text
1 1 1
```

Result:

```text
1 1 1
```

Why: All three values are 1, so the order looks the same.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
