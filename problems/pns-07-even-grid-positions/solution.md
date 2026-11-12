## Steps

1. Use one loop for rows.
2. Inside it, use another loop for columns.
3. Count positions whose row and column sum is even.

## Edge case

If either size is 0, the grid has no positions. The answer is 0.

## One correct answer

```python
rows = int(input())
columns = int(input())
count = 0
for row in range(rows):
    for column in range(columns):
        if (row + column) % 2 == 0:
            count += 1
print(count)
```
