## Learn

A function can use a loop and return its final total. The same function works for different inputs.

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

Complete sum_range(start, end). Add every whole number from start through end. start is never greater than end. Values use -50 through 50.

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

Start with the supplied code. Change the code near the comment.
