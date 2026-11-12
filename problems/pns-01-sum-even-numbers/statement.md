## Learn

A for loop uses each number from range(1, 4). The loop below prints 1, then 2, then 3. The stop value 4 is not included. For a value n, range(1, n + 1) includes n. The % sign gives the remainder. An even number has a remainder of 0 when divided by 2.

```python
for number in range(1, 4):
    print(number)
```

This code prints:

```text
1
2
3
```

## Your task

Read n. Add the even numbers from 1 through n. Show the total. If n is 0, show 0. The test values use 0 through 100.

**Example 1**

Input:

```text
6
```

Result:

```text
12
```

Why: The even numbers from 1 through 6 are 2, 4, and 6. Their sum is 2 + 4 + 6 = 12.

**Example 2**

Input:

```text
1
```

Result:

```text
0
```

Why: There are no even numbers from 1 through 1, so the sum is 0.

Start with the supplied code. Change the code near the comment.
