## Learn

A set keeps each value once. Adding 2 twice and 5 once leaves two values in the example set. In the task, count how many different input numbers the set contains.

```python
seen = set()
seen.add(2)
seen.add(2)
seen.add(5)
print(seen)
```

This code prints:

```text
{2, 5}
```

## Your task

Read one line of space-separated integers. Print how many different integers it contains. Repeated integers count once. A blank line gives 0.

**Example 1**

Input:

```text
2 2 5
```

Result:

```text
2
```

Why: The different values are 2 and 5, so the count is 2.

**Example 2**

Input:

```text
4 4 4
```

Result:

```text
1
```

Why: All three values are 4, so there is one different value.

Write the full program. The starter comment is a reminder of the task.
