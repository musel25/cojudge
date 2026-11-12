## Learn

The & sign finds values shared by two sets. sorted() puts the result in increasing order.

```python
left = {1, 2, 3}
right = {2, 3, 4}
print(sorted(left & right))  # [2, 3]
```

This code prints:

```text
[2, 3]
```

## Your task

Read two lines of numbers. Show the numbers that appear in both lines, once each, in increasing order. If none are shared, show nothing.

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

Start with the supplied code. Change the code near the comment.
