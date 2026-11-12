## Learn

append adds one item to the end of a list. Build a new list when you want to keep only some items.

```python
small = []
small.append(2)
print(small)  # [2]
```

This code prints:

```text
[2]
```

## Your task

Read a line of numbers, then a limit on the next line. Keep values below the limit. Keep their original order. Show the kept numbers. Show nothing if none qualify.

**Example 1**

Input:

```text
8 2 5 1
5
```

Result:

```text
2 1
```

Why: Only 2 and 1 are below 5. Keep them in that order.

**Example 2**

Input:

```text
7 8
3
```

Result:

_No output_

Why: Neither 7 nor 8 is below 3, so there is no output.

When the result has several numbers, you can put spaces or new lines between them.

Start with the supplied code. Change the code near the comment.
