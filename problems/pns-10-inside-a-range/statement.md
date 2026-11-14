## Learn

A function can receive a value and return the result of a comparison. The example returns True because 20 is at least 18. In this task, your function must check two boundaries and return 1 or 0.

```python
def is_adult(age):
    return age >= 18

print(is_adult(20))
```

This code prints:

```text
True
```

## Your task

Write a function named inside(value, low, high). Return 1 when value is between low and high, including both ends. Return 0 otherwise. Read value, low, and high from three lines in that order. Call the function and print its result. low is never greater than high.

**Example 1**

Input:

```text
5
1
10
```

Result:

```text
1
```

Why: 5 is between 1 and 10, including the ends, so the result is 1.

**Example 2**

Input:

```text
11
1
10
```

Result:

```text
0
```

Why: 11 is above 10, so the result is 0.

Write the full program. The starter comment is a reminder of the task.
