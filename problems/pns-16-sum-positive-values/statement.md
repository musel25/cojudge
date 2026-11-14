## Learn

A for loop can visit each item in a list. Use if to choose the items that count.

```python
nums = [3, -2, 5]
for number in nums:
    print(number)
```

This code prints:

```text
3
-2
5
```

## Your task

Read one line of space-separated integers. Add only the integers greater than 0. Print the sum. A blank line is an empty list and gives 0.

**Example 1**

Input:

```text
3 -2 5
```

Result:

```text
8
```

Why: Only 3 and 5 are positive. Their sum is 8.

**Example 2**

Input:

```text
-4 0
```

Result:

```text
0
```

Why: Neither -4 nor 0 is positive, so the sum is 0.

Write the full program. The starter comment is a reminder of the task.
