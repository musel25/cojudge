## Steps

1. Try each number from 1 through n.
2. Use % to check for a remainder of 0.
3. Count each divisor.

## Edge case

The number 1 has one positive divisor: 1.

## One correct answer

```python
n = int(input())
count = 0
for value in range(1, n + 1):
    if n % value == 0:
        count += 1
print(count)
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2014/02/26/04-divisors.html). The task text and cases here are new.
