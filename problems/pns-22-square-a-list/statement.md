## Learn

A list comprehension makes a new list. This example doubles each value in [2, 3] and gives [4, 6]. In the task, make a new value by multiplying each number by itself.

```python
values = [2, 3]
doubled = [value * 2 for value in values]
print(doubled)
```

This code prints:

```text
[4, 6]
```

## Your task

Read one line of space-separated integers. Print the square of each integer in the same order, separated by spaces or new lines. A blank line gives no output.

**Example 1**

Input:

```text
2 -3 0
```

Result:

```text
4 9 0
```

Why: The squares of 2, -3, and 0 are 4, 9, and 0.

**Example 2**

Input:

_One blank line_

Result:

_No output_

Why: The list is empty, so there are no squares to show.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
