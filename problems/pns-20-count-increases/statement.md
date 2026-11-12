## Learn

Compare each item with the item before it. len(nums) gives the number of items. Start at index 1 because index 0 has no item before it.

**Idea en español:** Compara cada valor con el anterior. len() da la cantidad de valores.

```python
nums = [2, 5, 4]
print(nums[1] > nums[0])  # True
```

## Your task

Read one line of numbers. Count how many values are greater than the value just before them. A blank or one-item list gives 0.

**En español:** Cuenta cuántos números son mayores que el número anterior.

**Example 1**

Input:

```text
2 5 4 7
```

Result:

```text
2
```

**Example 2**

Input:

```text
8
```

Result:

```text
0
```

Start with the supplied code. Change the code near the comment.
