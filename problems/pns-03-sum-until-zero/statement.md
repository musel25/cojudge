## Learn

A while loop repeats while its condition is true. A special input value can tell the loop to stop. Here, 0 is the stop value.

```python
value = 3
total = 0
while value != 0:
    total += value
    value -= 1
print(total)
```

This code prints:

```text
6
```

## Your task

Read numbers until you read 0. Add the numbers before 0. Show the sum. The input always has a final 0.

**Example 1**

Input:

```text
3
4
0
```

Result:

```text
7
```

Why: Add 3 and 4. Stop when you read 0, so the result is 7.

**Example 2**

Input:

```text
0
```

Result:

```text
0
```

Why: The first number is 0. There are no numbers to add.

Start with the supplied code. Change the code near the comment.
