## Learn

Two strings have a character at each position. Compare the characters at the same index.

```python
first = "cat"
second = "car"
print(first[2] != second[2])  # True
```

This code prints:

```text
True
```

## Your task

Read two lines of text with the same length. Count positions where their characters differ. Big and small letters are different.

**Example 1**

Input:

```text
cat
car
```

Result:

```text
1
```

Why: cat and car differ only at the last position, so the count is 1.

**Example 2**

Input:

```text
abc
abc
```

Result:

```text
0
```

Why: abc and abc have the same character at every position.

Start with the supplied code. Change the code near the comment.
