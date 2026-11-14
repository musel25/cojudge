## Learn

split() separates a line at whitespace. Repeated spaces do not make empty words. This example makes a list with red and blue. len() counts the items in a list.

```python
words = "red   blue".split()
print(words)
```

This code prints:

```text
['red', 'blue']
```

## Your task

Read one line of text. Count its words and print the count. Spaces separate words. Extra spaces do not make extra words. A blank line gives 0.

**Example 1**

Input:

```text
red blue green
```

Result:

```text
3
```

Why: red, blue, and green are three words.

**Example 2**

Input:

```text
  one   two
```

Result:

```text
2
```

Why: Extra spaces do not create words. The words are one and two.

Write the full program. The starter comment is a reminder of the task.
