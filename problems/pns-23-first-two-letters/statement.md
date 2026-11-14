## Learn

A string slice selects characters from a start position up to, but not including, an end position. This example prints positions 1 and 2: yt. A slice can return fewer characters than requested.

```python
text = "python"
print(text[1:3])
```

This code prints:

```text
yt
```

## Your task

Read one line of text. Print its first two characters. If the line has fewer than two characters, print all that it has. Keep the original letter case.

**Example 1**

Input:

```text
python
```

Result:

```text
py
```

Why: The first two characters of python are p and y.

**Example 2**

Input:

```text
A
```

Result:

```text
A
```

Why: A has one character, so show A.

Write the full program. The starter comment is a reminder of the task.
