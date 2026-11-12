## Learn

split() divides text at spaces and gives a list of words. len() gives the number of items in that list.

```python
words = "red blue green".split()
print(len(words))  # 3
```

This code prints:

```text
3
```

## Your task

Read one line of text. Count its space-separated words. Extra spaces do not make extra words. Show the count.

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

Start with the supplied code. Change the code near the comment.
