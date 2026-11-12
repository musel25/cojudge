## Learn

A list comprehension makes a new list from old items. Read it as: make number * number for each number in nums.

```python
nums = [2, 3]
squares = [number * number for number in nums]
print(squares)  # [4, 9]
```

This code prints:

```text
[4, 9]
```

## Your task

Read one line of numbers. Show the square of each number in the same order. A blank line gives no output.

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

Start with the supplied code. Change the code near the comment.
