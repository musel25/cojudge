## Learn

A function can use a loop and return its final total. This example adds 1, 2, and 3. In the task, your function will use the two input numbers as the range limits.

```python
def add_to_three():
    total = 0
    for number in range(1, 4):
        total += number
    return total

print(add_to_three())
```

This code prints:

```text
6
```

## Your task

Write a function named sum_range(start, end). Return the sum of every integer from start through end, including both ends. Read start and end from two lines. Call the function and print its result. start is never greater than end. Values use -50 through 50.

**Example 1**

Input:

```text
2
4
```

Result:

```text
9
```

Why: Add 2 + 3 + 4 to get 9.

**Example 2**

Input:

```text
-2
2
```

Result:

```text
0
```

Why: Add -2 + -1 + 0 + 1 + 2 to get 0.

Write the full program. The starter comment is a reminder of the task.
