## Learn

A while loop checks its condition before each repeat. In the example below, it prints 3, 2, and 1. When value becomes 0, the condition is false and the loop stops. In this task, 0 comes from the input instead.

```python
value = 3
while value != 0:
    print(value)
    value -= 1
```

This code prints:

```text
3
2
1
```

## Your task

Read one integer per line. Stop when you read 0. Print the sum of all numbers before that 0. Do not add 0. Print only the number. The input always ends with 0.

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

Why: Read 3, then 4, then 0. Add 3 + 4 to get 7. The 0 ends the input and is not added.

**Example 2**

Input:

```text
0
```

Result:

```text
0
```

Why: The first number is 0, so there are no earlier numbers to add. Print 0.

Write the full program. The starter comment is a reminder of the stop value.
