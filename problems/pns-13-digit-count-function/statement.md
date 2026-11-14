## Learn

A while loop can remove one digit at a time. The // sign divides and keeps only the whole-number part.

```python
number = 123
number = number // 10
print(number)  # 12
```

This code prints:

```text
12
```

## Your task

Write a function named digit_count(number). Return its number of decimal digits. The number 0 has one digit. Read one integer from the first line. Call the function and print its result. Inputs use 0 through 1,000,000.

**Example 1**

Input:

```text
123
```

Result:

```text
3
```

Why: 123 has three decimal digits: 1, 2, and 3.

**Example 2**

Input:

```text
0
```

Result:

```text
1
```

Why: 0 is one digit, so the result is 1.

Write the full program. The starter comment is a reminder of the task.
