## Learn

A while loop can grow a value until it reaches a goal. Keep changing the value inside the loop so it can stop.

```python
power = 1
while power < 8:
    power = power * 2
print(power)
```

This code prints:

```text
8
```

## Your task

Read target. Start at 1. Double the number until it is at least target. Show that number. The target uses 1 through 10000.

**Example 1**

Input:

```text
9
```

Result:

```text
16
```

Why: Double 1 to get 2, 4, 8, then 16. The first value at least 9 is 16.

**Example 2**

Input:

```text
1
```

Result:

```text
1
```

Why: The starting value 1 already meets the target.

Start with the supplied code. Change the code near the comment.
