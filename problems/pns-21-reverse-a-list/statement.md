## Learn

A slice with step -1 makes a list in reverse order. This example changes ["a", "b", "c"] to ["c", "b", "a"]. In the task, read integers and print them without list brackets.

```python
letters = ["a", "b", "c"]
print(letters[::-1])
```

This code prints:

```text
['c', 'b', 'a']
```

## Your task

Read one line of space-separated integers. Print them in reverse order, separated by spaces or new lines. A blank line gives no output.

**Example 1**

Input:

```text
4 8 3
```

Result:

```text
3 8 4
```

Why: Read 4, 8, 3 from the end to get 3, 8, 4.

**Example 2**

Input:

_One blank line_

Result:

_No output_

Why: The list is empty, so there is no output.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
