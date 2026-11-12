## Steps

1. Start total at 0.
2. Visit each number from 1 through n.
3. Add its square to total.

## Edge case

For n = 0, the loop has no numbers and the result is 0.

## One correct answer

```python
n = int(input())
total = 0
for number in range(1, n + 1):
    total += number * number
print(total)
```
