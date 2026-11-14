## Learn

A for loop visits each number in a range. In range(1, 4), it visits 1, 2, and 3. It stops before 4. The % operator gives the remainder after division. For example, 5 % 2 is 1, and 6 % 2 is 0. A number is even when division by 2 leaves no remainder.

```python
for number in range(1, 4):
    print(number)
print(5 % 2)
```

This code prints:

```text
1
2
3
1
```

## Your task

Read one integer n from the first line. Print the sum of all even integers from 1 through n, including n if it is even. Print only the number. If n is 0, print 0. The test values use 0 through 100.

**Example 1**

Input:

```text
6
```

Result:

```text
12
```

Why: From 1 through 6, the even numbers are 2, 4, and 6. Add 2 + 4 + 6 to get 12.

**Example 2**

Input:

```text
1
```

Result:

```text
0
```

Why: The only number from 1 through 1 is 1. It is odd, so the sum is 0.

Write the full program. The starter comment is a reminder of the task.
