## Learn

A string slice with step -1 reads characters from the end to the start. Keep spaces and letter case.

```python
text = "cat"
print(text[::-1])  # tac
```

This code prints:

```text
tac
```

## Your task

Read one line of text. Show its characters in reverse order. Keep every space and the original letter case.

**Example 1**

Input:

```text
cat
```

Result:

```text
tac
```

Why: Read cat from the end to get tac.

**Example 2**

Input:

```text
A b
```

Result:

```text
b A
```

Why: Read A, space, b from the end to get b, space, A.

Start with the supplied code. Change the code near the comment.
