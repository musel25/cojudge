## Learn

A function can receive more than one value. These values are its parameters. A result of 1 can mean yes, and 0 can mean no.

```python
def inside(value, low, high):
    return low <= value <= high

print(inside(5, 1, 10))
```

This code prints:

```text
True
```

## Your task

Complete inside(value, low, high). Return 1 when value is from low through high, including both ends. Otherwise return 0. low is never greater than high.

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

Start with the supplied code. Change the code near the comment.
