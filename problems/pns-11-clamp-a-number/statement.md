## Learn

return ends a function. You can return early when a value is too small or too large.

```python
def at_least_zero(value):
    if value < 0:
        return 0
    return value

print(at_least_zero(-3))
```

This code prints:

```text
0
```

## Your task

Write a function named clamp(value, low, high). Return low when value is below low. Return high when value is above high. Otherwise return value. Read value, low, and high from three lines in that order. Call the function and print its result. low is never greater than high.

**Example 1**

Input:

```text
15
0
10
```

Result:

```text
10
```

Why: 15 is above 10, so clamp returns the upper bound 10.

**Example 2**

Input:

```text
6
0
10
```

Result:

```text
6
```

Why: 6 is between 0 and 10, so clamp returns 6.

Write the full program. The starter comment is a reminder of the task.
