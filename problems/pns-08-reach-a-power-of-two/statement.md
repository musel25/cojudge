## Learn

A while loop repeats while its condition is true. In this example, value changes from 1 to 3 to 5. At 5, the condition is false and the loop stops. In the task, you will double a value instead of adding 2.

```python
value = 1
while value < 5:
    value += 2
print(value)
```

This code prints:

```text
5
```

## Your task

Read one integer target from the first line. Start with the number 1. Double it until it is at least target. Print the first number that reaches or passes target. The target uses 1 through 10000.

**Example 1**

Input:

```text
9
```

Result:

```text
16
```

Why: Double 1 to get 2, 4, 8, then 16. The first value at least 9 is 16.

**Example 2**

Input:

```text
1
```

Result:

```text
1
```

Why: The starting value 1 already meets the target.

Write the full program. The starter comment is a reminder of the task.
