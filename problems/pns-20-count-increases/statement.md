## Learn

Compare each item with the item before it. len(nums) gives the number of items. Start at index 1 because index 0 has no item before it.

```python
nums = [2, 5, 4]
print(nums[1] > nums[0])  # True
```

This code prints:

```text
True
```

## Your task

Read one line of numbers. Count how many values are greater than the value just before them. A blank or one-item list gives 0.

**Example 1**

Input:

```text
2 5 4 7
```

Result:

```text
2
```

Why: 5 is greater than 2, and 7 is greater than 4. These are two increases.

**Example 2**

Input:

```text
8
```

Result:

```text
0
```

Why: One value has no previous value to compare.

Start with the supplied code. Change the code near the comment.
