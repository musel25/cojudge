## Learn

The & operator gives values shared by two sets. This example gives a set containing 2 and 3. A set has no required order, so use sorted() when the result must increase.

```python
left = {1, 2, 3}
right = {2, 3, 4}
print(left & right)
```

This code prints:

```text
{2, 3}
```

## Your task

Read two lines of space-separated integers. Print the integers that occur in both lines, once each, in increasing order. Separate results with spaces or new lines. If none is shared, print nothing.

**Example 1**

Input:

```text
1 2 2 3
2 3 4
```

Result:

```text
2 3
```

Why: Both lines contain 2 and 3. Show each once in increasing order.

**Example 2**

Input:

```text
1 2
3 4
```

Result:

_No output_

Why: The two lines share no number, so there is no output.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
