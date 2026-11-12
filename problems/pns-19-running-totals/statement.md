## Learn

A running total changes after each item. Append each new total to an answer list.

```python
total = 0
for number in [2, 3]:
    total += number
    print(total)  # 2, then 5
```

This code prints:

```text
2
5
```

## Your task

Read one line of numbers. Show the total after each number. For 2 3 -1, show 2 5 4. A blank line gives no output.

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

Start with the supplied code. Change the code near the comment.
