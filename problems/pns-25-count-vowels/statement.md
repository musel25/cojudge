## Learn

lower() changes big letters to small letters. Use in to check whether one character is in a group.

```python
letter = "A"
print(letter.lower() in "aeiou")  # True
```

This code prints:

```text
True
```

## Your task

Read one line of text. Count the letters a, e, i, o, and u. Count upper-case and lower-case letters. Print the count. Other characters do not count.

**Example 1**

Input:

```text
Apple
```

Result:

```text
2
```

Why: Apple has two vowels: A and e.

**Example 2**

Input:

```text
sky
```

Result:

```text
0
```

Why: sky has none of a, e, i, o, or u.

Write the full program. The starter comment is a reminder of the task.
