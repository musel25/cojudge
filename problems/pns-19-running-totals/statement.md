## Learn

A running total changes after each item. Append each new total to an answer list.

**Idea en español:** La suma acumulada cambia después de cada valor.

```python
total = 0
for number in [2, 3]:
    total += number
    print(total)  # 2, then 5
```

## Your task

Read one line of numbers. Show the total after each number. For 2 3 -1, show 2 5 4. A blank line gives no output.

**En español:** Muestra la suma acumulada después de cada número.

**Example 1**

Input:

```text
2 3 -1
```

Result:

```text
2 5 4
```

**Example 2**

Input:

_One blank line_

Result:

_No output_

When the result has several numbers, you can put spaces or new lines between them.

Start with the supplied code. Change the code near the comment.
