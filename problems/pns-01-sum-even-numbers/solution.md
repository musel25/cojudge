## Steps

1. Start a total at zero.
2. Visit each number through n.
3. Add a number only when it is even.

## Edge case

When n is 0, the loop does not run. The total stays 0.

## One correct answer

```python
n = int(input())
total = 0
for number in range(1, n + 1):
    if number % 2 == 0:
        total += number
print(total)
```
