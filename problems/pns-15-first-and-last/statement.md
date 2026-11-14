## Learn

split() separates one line of text into parts. List positions start at 0. Position -1 selects the last item. In the task, change each part into an integer before you print the first and last values.

```python
nums = [4, 8, 3]
print(nums[0], nums[-1])  # 4 3
```

This code prints:

```text
4 3
```

## Your task

Read one line of space-separated integers. Print the first integer and the last integer. Separate them with a space or a new line. The line always contains at least one integer.

**Example 1**

Input:

```text
4 8 3
```

Result:

```text
4 3
```

Why: The first number is 4 and the last is 3.

**Example 2**

Input:

```text
7
```

Result:

```text
7 7
```

Why: 7 is both the first and last number.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
