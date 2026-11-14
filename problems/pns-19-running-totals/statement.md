## Learn

A running total changes after each value. This example prints 4 after the first value and 3 after the second. The task asks you to read the values from input and show every new total.

```python
total = 0
for value in [4, -1]:
    total += value
    print(total)
```

This code prints:

```text
4
3
```

## Your task

Read one line of space-separated integers. Print the total after each integer, in input order. Separate totals with spaces or new lines. For 2 3 -1, print 2 5 4. A blank line gives no output.

**Example 1**

Input:

```text
2 3 -1
```

Result:

```text
2 5 4
```

Why: After 2 the total is 2. After 3 it is 5. After -1 it is 4.

**Example 2**

Input:

_One blank line_

Result:

_No output_

Why: There are no values, so there are no running totals.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
