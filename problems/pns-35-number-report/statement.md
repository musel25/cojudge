## Learn

A function can return several useful values. Use len(), sum(), max(), and set() on the same list.

```python
nums = [2, 2, 5]
print(len(nums), sum(nums))  # 3 9
```

This code prints:

```text
3 9
```

## Your task

Read one line of numbers. Show four values: count, sum, largest value, and number of different values. For an empty list, use 0 for the largest value.

**Example 1**

Input:

```text
2 2 5
```

Result:

```text
3 9 5 2
```

Why: There are three values. Their sum is 9, the largest is 5, and there are two different values.

**Example 2**

Input:

_One blank line_

Result:

```text
0 0 0 0
```

Why: The list is empty. The task uses 0 for each of the four results.

When the result has several numbers, you can put spaces or new lines between them.

Start with the supplied code. Change the code near the comment.
