## Learn

A slice with step -1 reads a sequence from its end to its start. This example reverses a list of letters. The task asks you to reverse a whole string, including spaces.

```python
letters = ["c", "a", "t"]
print(letters[::-1])
```

This code prints:

```text
['t', 'a', 'c']
```

## Your task

Read one line of text. Print all its characters in reverse order. Keep every space and the original letter case. An empty line gives an empty line of output.

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

Write the full program. The starter comment is a reminder of the task.
